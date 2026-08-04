"""
Dataset loader for paired semiconductor image super-resolution.

Expects a split directory layout::

    dataset/
        train/
            GT/         # Ground-truth (clean) NumPy arrays
            NoisyLR/    # Noisy / low-quality input NumPy arrays

Array pairs are matched by filename (e.g. ``000001.npy`` in both folders).
"""

from __future__ import annotations

from pathlib import Path
from typing import Callable, List, Optional, Tuple, Union

import numpy as np
import torch
from torch.utils.data import Dataset

# Supported file extensions for pairing and loading.
IMAGE_EXTENSIONS = {".npy"}


class SemiconductorRestorationDataset(Dataset):
    """
    PyTorch Dataset for paired GT / NoisyLR semiconductor images.

    Each sample returns ``(input_tensor, ground_truth_tensor)`` where:

    - ``input_tensor`` comes from ``NoisyLR/`` (model input).
    - ``ground_truth_tensor`` comes from ``GT/`` (supervision target).

    Tensors have shape ``[1, H, W]`` (or ``[C, H, W]`` if already channel-first)
    and dtype ``torch.float32``. Values are loaded as-is with no normalization
    or clipping applied.

    Parameters
    ----------
    root_dir:
        Path to a split folder (e.g. ``dataset/train``) containing ``GT`` and
        ``NoisyLR`` subdirectories.
    transform:
        Optional callable applied identically to both input and ground-truth
        tensors after loading (e.g. random crop for training augmentations).
    """

    GT_SUBDIR = "GT"
    INPUT_SUBDIR = "NoisyLR"

    def __init__(
        self,
        root_dir: Union[str, Path],
        transform: Optional[Callable[[torch.Tensor, torch.Tensor], Tuple[torch.Tensor, torch.Tensor]]] = None,
    ) -> None:
        self.root_dir = Path(root_dir)
        self.gt_dir = self.root_dir / self.GT_SUBDIR
        self.input_dir = self.root_dir / self.INPUT_SUBDIR
        self.transform = transform

        self._validate_directories()
        self.pairs: List[Tuple[Path, Path]] = self._build_and_validate_pairs()

    def __len__(self) -> int:
        """Return the number of valid image pairs."""
        return len(self.pairs)

    def __getitem__(self, index: int) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Load and return one paired sample.

        Parameters
        ----------
        index:
            Sample index in ``[0, len(self))``.

        Returns
        -------
        input_image:
            Noisy / low-quality image tensor from ``NoisyLR/``.
        ground_truth_image:
            Clean reference image tensor from ``GT/``.
        """
        if index < 0 or index >= len(self.pairs):
            raise IndexError(f"Index {index} is out of range for dataset of size {len(self.pairs)}.")

        input_path, gt_path = self.pairs[index]

        input_tensor = self._load_npy_tensor(input_path)
        gt_tensor = self._load_npy_tensor(gt_path)

        _validate_tensor_type(input_tensor, input_path.name)
        _validate_tensor_type(gt_tensor, gt_path.name)

        if self.transform is not None:
            input_tensor, gt_tensor = self.transform(input_tensor, gt_tensor)

        return input_tensor, gt_tensor

    def get_pair_filename(self, index: int) -> str:
        """Return the shared filename for the pair at ``index``."""
        return self.pairs[index][0].name

    def _validate_directories(self) -> None:
        """Ensure the split root and required subfolders exist."""
        if not self.root_dir.is_dir():
            raise FileNotFoundError(f"Dataset root directory not found: {self.root_dir}")

        if not self.gt_dir.is_dir():
            raise FileNotFoundError(f"Ground-truth directory not found: {self.gt_dir}")

        if not self.input_dir.is_dir():
            raise FileNotFoundError(f"NoisyLR input directory not found: {self.input_dir}")

    def _build_and_validate_pairs(self) -> List[Tuple[Path, Path]]:
        """
        Match GT and NoisyLR arrays by filename and validate completeness.

        Raises
        ------
        ValueError
            If any file exists in only one folder, or if no valid pairs exist.
        FileNotFoundError
            If a paired file path does not exist on disk.
        """
        gt_files = self._collect_array_files(self.gt_dir)
        input_files = self._collect_array_files(self.input_dir)

        gt_names = {path.name for path in gt_files}
        input_names = {path.name for path in input_files}

        missing_in_noisy_lr = sorted(gt_names - input_names)
        missing_in_gt = sorted(input_names - gt_names)

        if missing_in_noisy_lr or missing_in_gt:
            message_parts = ["Incomplete array pairs detected:"]

            if missing_in_noisy_lr:
                message_parts.append(
                    f"  - {len(missing_in_noisy_lr)} GT file(s) missing from NoisyLR/: "
                    + ", ".join(missing_in_noisy_lr[:5])
                    + (" ..." if len(missing_in_noisy_lr) > 5 else "")
                )

            if missing_in_gt:
                message_parts.append(
                    f"  - {len(missing_in_gt)} NoisyLR file(s) missing from GT/: "
                    + ", ".join(missing_in_gt[:5])
                    + (" ..." if len(missing_in_gt) > 5 else "")
                )

            raise ValueError("\n".join(message_parts))

        # Stable ordering by filename for reproducible indexing.
        pairs = [(self.input_dir / name, self.gt_dir / name) for name in sorted(gt_names)]

        if not pairs:
            raise ValueError(
                f"No NumPy array pairs found under {self.root_dir}. "
                f"Expected matching .npy files in '{self.GT_SUBDIR}/' and '{self.INPUT_SUBDIR}/'."
            )

        for input_path, gt_path in pairs:
            if not input_path.is_file():
                raise FileNotFoundError(f"NoisyLR file not found: {input_path}")
            if not gt_path.is_file():
                raise FileNotFoundError(f"GT file not found: {gt_path}")

        return pairs

    @staticmethod
    def _collect_array_files(directory: Path) -> List[Path]:
        """Collect .npy files directly inside ``directory`` (non-recursive)."""
        files = [
            path
            for path in directory.iterdir()
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ]
        return sorted(files, key=lambda path: path.name)

    @staticmethod
    def _load_npy_tensor(array_path: Path) -> torch.Tensor:
        """
        Load a NumPy array and convert it to a ``torch.float32`` tensor.

        If the array has shape ``(H, W)``, a channel dimension is inserted to
        produce shape ``(1, H, W)``. No resizing, normalization, or clipping
        is applied.

        Returns
        -------
        torch.Tensor
            Float32 tensor with shape ``(1, H, W)`` or ``(C, H, W)``.
        """
        if not array_path.is_file():
            raise FileNotFoundError(f"Array file not found: {array_path}")

        try:
            array = np.load(array_path)
        except Exception as exc:
            raise OSError(f"Failed to read array '{array_path}': {exc}") from exc

        if not isinstance(array, np.ndarray):
            raise TypeError(
                f"Expected numpy.ndarray in '{array_path.name}', got {type(array).__name__}."
            )

        tensor = torch.from_numpy(array).to(torch.float32)

        # Add channel dimension for 2D spatial arrays: [H, W] -> [1, H, W].
        if tensor.ndim == 2:
            tensor = tensor.unsqueeze(0)

        return tensor


def _validate_tensor_type(tensor: torch.Tensor, filename: str) -> None:
    """
    Validate that a loaded sample is a floating-point torch tensor.

    Raises
    ------
    TypeError
        If the object is not a ``torch.Tensor`` or not ``torch.float32``.
    """
    if not isinstance(tensor, torch.Tensor):
        raise TypeError(
            f"Expected torch.Tensor for '{filename}', got {type(tensor).__name__}."
        )

    if tensor.dtype != torch.float32:
        raise TypeError(
            f"Expected torch.float32 for '{filename}', got {tensor.dtype}."
        )
