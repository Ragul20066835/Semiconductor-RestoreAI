"""
Inspect semiconductor dataset .npy files before training.

Loads paired GT and NoisyLR samples and prints array statistics.
This script is read-only: it does not modify, save, or visualize data.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

GT_PATH = Path("dataset/train/GT/000000.npy")
NOISYLR_PATH = Path("dataset/train/NoisyLR/000000.npy")


def print_array_report(label: str, array: np.ndarray) -> None:
    """Print formatted statistics for a single numpy array."""
    print(f"\n{'-' * 60}")
    print(label)
    print(f"{'-' * 60}")
    print(f"Shape:              {array.shape}")
    print(f"Number of dims:     {array.ndim}")
    print(f"Total elements:     {array.size:,}")
    print(f"Data type (dtype):  {array.dtype}")
    print(f"Minimum value:      {array.min():.6f}")
    print(f"Maximum value:      {array.max():.6f}")
    print(f"Mean value:         {array.mean():.6f}")
    print(f"Standard deviation: {array.std():.6f}")


def load_npy_file(path: Path) -> np.ndarray:
    """Load a .npy file and return the array without modification."""
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    return np.load(path)


def main() -> None:
    print("=" * 60)
    print("Semiconductor Dataset Inspection")
    print("=" * 60)
    print(f"\nGT file:      {GT_PATH}")
    print(f"NoisyLR file: {NOISYLR_PATH}")

    gt_array = load_npy_file(GT_PATH)
    noisy_array = load_npy_file(NOISYLR_PATH)

    print_array_report("Ground Truth (GT)", gt_array)
    print_array_report("Noisy / Low-Quality Input (NoisyLR)", noisy_array)

    print(f"\n{'=' * 60}")
    print("Pair Comparison")
    print(f"{'=' * 60}")
    shapes_match = gt_array.shape == noisy_array.shape
    print(f"GT shape:              {gt_array.shape}")
    print(f"NoisyLR shape:         {noisy_array.shape}")
    print(f"Shapes identical:      {shapes_match}")

    print(f"\n{'=' * 60}")
    print("Inspection Complete")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
