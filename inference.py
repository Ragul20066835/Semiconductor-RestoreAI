"""
Inference engine for semiconductor image restoration with SwinIR.

Loads a trained checkpoint, restores a single grayscale image, and saves the
output to disk. Training code is not used during inference.

Example
-------
python inference.py \\
    --checkpoint outputs/experiment/checkpoints/best.pt \\
    --input dataset/test/noisy/sample.png \\
    --output outputs/restored/sample.png
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

from models.builder import build_swinir

LOGGER = logging.getLogger("semiconductor_restoreai.inference")

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".npy"}


class InferenceEngine:
    """
    Run SwinIR inference on a single grayscale image.

    Parameters
    ----------
    checkpoint_path:
        Path to a training checkpoint (``best.pt`` or ``latest.pt``).
    device:
        Torch device for inference (``auto``, ``cpu``, or ``cuda``).
    """

    def __init__(self, checkpoint_path: Path, device: torch.device) -> None:
        self.checkpoint_path = checkpoint_path
        self.device = device

        checkpoint = self._load_checkpoint_file(checkpoint_path)
        self.model = self._build_model_from_checkpoint(checkpoint).to(self.device)
        self.model.eval()

        self.checkpoint_epoch = int(checkpoint.get("epoch", 0))
        self.checkpoint_metrics = checkpoint.get("metrics", {})

        LOGGER.info("Loaded checkpoint: %s", checkpoint_path)
        LOGGER.info("Checkpoint epoch: %d", self.checkpoint_epoch)
        if self.checkpoint_metrics:
            LOGGER.info(
                "Checkpoint metrics | PSNR: %s | SSIM: %s",
                _format_metric(self.checkpoint_metrics.get("psnr")),
                _format_metric(self.checkpoint_metrics.get("ssim")),
            )

    @torch.no_grad()
    def restore_image(self, input_path: Path, output_path: Path) -> Path:
        """
        Restore one image and save the result.

        Parameters
        ----------
        input_path:
            Path to the noisy / low-quality grayscale input image.
        output_path:
            Path where the restored image will be written.

        Returns
        -------
        Path
            The output path that was written.
        """
        input_path = Path(input_path)
        output_path = Path(output_path)

        if not input_path.is_file():
            raise FileNotFoundError(f"Input image not found: {input_path}")

        output_path.parent.mkdir(parents=True, exist_ok=True)

        if output_path.suffix.lower() == ".npy":
            npy_path = output_path
            png_path = output_path.with_suffix(".png")
        else:
            png_path = output_path
            npy_path = output_path.with_suffix(".npy")

        input_tensor = load_grayscale_image(input_path)
        original_size = input_tensor.shape[-2:]

        LOGGER.info("Input image: %s (%dx%d)", input_path.name, original_size[1], original_size[0])

        input_batch = input_tensor.unsqueeze(0).to(self.device)
        output_batch = self.model(input_batch)
        restored_tensor = output_batch.squeeze(0).clamp(0.0, 1.0).cpu()

        # Save restored output as both png and npy
        save_grayscale_image(restored_tensor, png_path)

        input_was_2d = False
        if input_path.suffix.lower() == ".npy":
            try:
                temp_arr = np.load(input_path)
                if temp_arr.ndim == 2:
                    input_was_2d = True
            except Exception:
                pass
        else:
            input_was_2d = True

        restored_numpy = restored_tensor.numpy()
        if input_was_2d:
            restored_numpy = np.squeeze(restored_numpy, axis=0)

        np.save(npy_path, restored_numpy)

        restored_size = restored_tensor.shape[-2:]
        LOGGER.info(
            "Restored image saved: %s (%dx%d)",
            png_path,
            restored_size[1],
            restored_size[0],
        )
        LOGGER.info(
            "Restored array saved: %s (shape %s)",
            npy_path,
            restored_numpy.shape,
        )

        return output_path

    def _load_checkpoint_file(self, checkpoint_path: Path) -> Dict[str, Any]:
        """Load and validate a checkpoint file from disk."""
        if not checkpoint_path.is_file():
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

        try:
            checkpoint = torch.load(checkpoint_path, map_location="cpu")
        except Exception as exc:
            raise RuntimeError(
                f"Failed to load checkpoint '{checkpoint_path}': {exc}"
            ) from exc

        if not isinstance(checkpoint, dict):
            raise ValueError(
                f"Invalid checkpoint format in '{checkpoint_path}': expected a dictionary."
            )

        if "model_state_dict" not in checkpoint:
            raise KeyError(
                f"Checkpoint '{checkpoint_path}' is missing 'model_state_dict'."
            )

        return checkpoint

    def _build_model_from_checkpoint(self, checkpoint: Dict[str, Any]) -> nn.Module:
        """Rebuild SwinIR using hyperparameters stored in the checkpoint."""
        train_args = checkpoint.get("args", {})
        if not isinstance(train_args, dict):
            raise ValueError("Checkpoint 'args' must be a dictionary.")

        model_kwargs = _extract_model_kwargs(train_args)
        model = build_swinir(**model_kwargs)

        try:
            model.load_state_dict(checkpoint["model_state_dict"], strict=True)
        except RuntimeError as exc:
            raise RuntimeError(
                "Checkpoint weights do not match the rebuilt SwinIR architecture. "
                "Ensure the checkpoint was produced by this project's training script."
            ) from exc

        return model


def load_grayscale_image(image_path: Path) -> torch.Tensor:
    """
    Load a grayscale image or NumPy array and convert it to a normalized tensor.

    Returns
    -------
    torch.Tensor
        Float tensor with shape ``[1, H, W]`` and values in ``[0.0, 1.0]``.
    """
    image_path = Path(image_path)
    suffix = image_path.suffix.lower()
    if suffix not in SUPPORTED_IMAGE_EXTENSIONS:
        raise ValueError(
            f"Unsupported image extension '{image_path.suffix}'. "
            f"Supported: {sorted(SUPPORTED_IMAGE_EXTENSIONS)}"
        )

    if suffix == ".npy":
        try:
            array = np.load(image_path)
        except Exception as exc:
            raise OSError(f"Failed to read array '{image_path}': {exc}") from exc

        if not isinstance(array, np.ndarray):
            raise TypeError(
                f"Expected numpy.ndarray in '{image_path.name}', got {type(array).__name__}."
            )

        tensor = torch.from_numpy(array).to(torch.float32)

        if tensor.ndim == 2:
            tensor = tensor.unsqueeze(0)
        return tensor

    try:
        with Image.open(image_path) as image:
            grayscale = image.convert("L")
            pixel_array = np.array(grayscale, dtype=np.float32) / 255.0
    except OSError as exc:
        raise OSError(f"Failed to read image '{image_path}': {exc}") from exc

    if pixel_array.ndim != 2:
        raise ValueError(f"Expected 2D grayscale image, got shape {pixel_array.shape}.")

    return torch.from_numpy(pixel_array).unsqueeze(0)


def save_grayscale_image(tensor: torch.Tensor, output_path: Path) -> None:
    """
    Save a normalized grayscale tensor as an image file.

    Parameters
    ----------
    tensor:
        Tensor shaped ``[1, H, W]`` or ``[H, W]`` with values in ``[0, 1]``.
    output_path:
        Destination file path. Parent directories are created if needed.
    """
    output_path = Path(output_path)

    if tensor.ndim == 3:
        if tensor.shape[0] != 1:
            raise ValueError(
                f"Expected single-channel tensor [1, H, W], got {tuple(tensor.shape)}."
            )
        tensor = tensor.squeeze(0)

    if tensor.ndim != 2:
        raise ValueError(f"Expected 2D grayscale tensor, got shape {tuple(tensor.shape)}.")

    pixel_array = (
        tensor.detach()
        .float()
        .clamp(0.0, 1.0)
        .mul(255.0)
        .round()
        .byte()
        .cpu()
        .numpy()
    )

    Image.fromarray(pixel_array, mode="L").save(output_path)


def _extract_model_kwargs(train_args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map training CLI args from a checkpoint to ``build_swinir`` keyword arguments.

    Falls back to ``build_swinir`` defaults when older checkpoints omit fields.
    """
    required_list_fields = ("depths", "num_heads")
    for field in required_list_fields:
        if field in train_args and not isinstance(train_args[field], list):
            raise ValueError(f"Checkpoint arg '{field}' must be a list.")

    return {
        "img_size": int(train_args.get("patch_size", 128)),
        "in_chans": int(train_args.get("in_chans", 1)),
        "embed_dim": int(train_args.get("embed_dim", 60)),
        "depths": tuple(train_args.get("depths", [2, 2, 2, 2])),
        "num_heads": tuple(train_args.get("num_heads", [2, 2, 2, 2])),
        "window_size": int(train_args.get("window_size", 8)),
        "upscale": int(train_args.get("upscale", 1)),
        "upsampler": str(train_args.get("upsampler", "")),
    }


def _format_metric(value: Any) -> str:
    """Format a metric value for logging."""
    if value is None:
        return "N/A"
    if isinstance(value, float):
        return f"{value:.4f}"
    return str(value)


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    """Parse command-line arguments for inference."""
    parser = argparse.ArgumentParser(
        description="Restore a grayscale semiconductor image using a trained SwinIR checkpoint.",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        required=True,
        help="Path to trained checkpoint (best.pt or latest.pt).",
    )
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="Path to the input noisy/low-quality grayscale image.",
    )
    parser.add_argument(
        "--output",
        type=str,
        required=True,
        help="Path where the restored image will be saved.",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        choices=["auto", "cpu", "cuda"],
        help="Computation device for inference.",
    )
    return parser.parse_args(argv)


def _configure_logging() -> None:
    """Configure console logging for inference."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def _resolve_device(device_arg: str) -> torch.device:
    """Resolve torch device from CLI argument."""
    if device_arg == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device_arg == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is not available.")
    return torch.device(device_arg)


def main(argv: Optional[list[str]] = None) -> None:
    """Entry point for the inference script."""
    _configure_logging()
    args = parse_args(argv)

    checkpoint_path = Path(args.checkpoint)
    input_path = Path(args.input)
    output_path = Path(args.output)
    device = _resolve_device(args.device)

    LOGGER.info("Using device: %s", device)

    engine = InferenceEngine(checkpoint_path=checkpoint_path, device=device)
    engine.restore_image(input_path=input_path, output_path=output_path)


if __name__ == "__main__":
    main()
