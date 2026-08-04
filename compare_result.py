"""
Visualization script to compare the original NoisyLR input and restored SwinIR output.

Loads the original NoisyLR numpy array and the restored PNG image, upscales
the original using nearest-neighbor interpolation for visualization purposes,
plots them side-by-side using matplotlib, saves the comparison figure,
and displays it on screen.
"""

from __future__ import annotations

from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image


def main() -> None:
    # 1. Define paths
    noisy_path = Path("dataset/test/NoisyLR/003181.npy")
    restored_path = Path("outputs/restored/003181.png")
    output_path = Path("outputs/restored/comparison.png")

    print(f"Loading original NoisyLR: {noisy_path}")
    print(f"Loading restored image: {restored_path}")

    # Ensure files exist
    if not noisy_path.is_file():
        raise FileNotFoundError(f"Original NoisyLR file not found at: {noisy_path}")
    if not restored_path.is_file():
        raise FileNotFoundError(f"Restored output file not found at: {restored_path}")

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 2. Load inputs
    # Load original .npy array
    noisy_arr = np.load(noisy_path)
    
    # Squeeze channel/batch dimensions if present
    if noisy_arr.ndim == 3:
        if noisy_arr.shape[0] == 1:
            noisy_arr = np.squeeze(noisy_arr, axis=0)
        elif noisy_arr.shape[-1] == 1:
            noisy_arr = np.squeeze(noisy_arr, axis=-1)

    if noisy_arr.ndim != 2:
        raise ValueError(f"Expected 2D array for NoisyLR, got shape {noisy_arr.shape}")

    # Load restored PIL Image
    restored_img = Image.open(restored_path)

    # 3. Process NoisyLR for visualization (upscale using nearest-neighbor)
    # Clip float values to [0, 1] range, convert to uint8 grayscale PIL image
    noisy_normalized = np.clip(noisy_arr, 0.0, 1.0)
    noisy_uint8 = (noisy_normalized * 255.0).round().astype(np.uint8)
    noisy_pil = Image.fromarray(noisy_uint8, mode="L")
    
    # Upscale from 128x128 to 256x256 using nearest-neighbor interpolation
    target_width, target_height = restored_img.size
    noisy_upscaled = noisy_pil.resize((target_width, target_height), resample=Image.NEAREST)

    print(f"Original shape: {noisy_arr.shape} -> Upscaled for visualization: {noisy_upscaled.size}")
    print(f"Restored image shape: {restored_img.size}")

    # 4. Display and save the comparison using matplotlib
    fig, axes = plt.subplots(1, 2, figsize=(10, 5))

    # Left plot: Original NoisyLR
    axes[0].imshow(noisy_upscaled, cmap="gray")
    axes[0].set_title("Original NoisyLR (128×128)")
    axes[0].axis("off")

    # Right plot: Restored output
    axes[1].imshow(restored_img, cmap="gray")
    axes[1].set_title("Restored Output (256×256)")
    axes[1].axis("off")

    plt.tight_layout()

    # Save figure
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    print(f"Comparison saved successfully to: {output_path}")

    # Display figure on screen
    plt.show()


if __name__ == "__main__":
    main()
