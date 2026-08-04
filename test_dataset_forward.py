"""
Real dataset forward-pass test for Semiconductor RestoreAI.

This script verifies that:
1. The dataset loads correctly.
2. SwinIR accepts the real LR image.
3. The model outputs a 2× super-resolved image.
4. Loss and metrics work correctly.

No training or checkpoint saving is performed.
"""

import torch

from models.builder import build_swinir
from utils.dataset import SemiconductorRestorationDataset
from utils.losses import LossFactory
from utils.metrics import MetricFactory


def main():

    print("=" * 60)
    print("Real Dataset Forward Pass Test")
    print("=" * 60)

    # Load dataset
    dataset = SemiconductorRestorationDataset("dataset/train")

    print(f"\nDataset Size : {len(dataset)}")
    print(f"First Sample : {dataset.get_pair_filename(0)}")

    # Load first sample
    input_tensor, target_tensor = dataset[0]

    print("\nInput Shape :", input_tensor.shape)
    print("Target Shape:", target_tensor.shape)

    print("\nInput dtype :", input_tensor.dtype)
    print("Target dtype:", target_tensor.dtype)

    # Add batch dimension
    input_tensor = input_tensor.unsqueeze(0)
    target_tensor = target_tensor.unsqueeze(0)

    # Build model
    model = build_swinir()
    model.eval()

    # Forward pass
    with torch.no_grad():
        prediction = model(input_tensor)

    print("\nPrediction Shape:", prediction.shape)

    # Verify output shape
    if prediction.shape != target_tensor.shape:
        raise ValueError(
            f"\nShape mismatch!\n"
            f"Prediction : {prediction.shape}\n"
            f"Target     : {target_tensor.shape}"
        )

    # Loss
    criterion = LossFactory.build("l1")
    loss = criterion(prediction, target_tensor)

    # Metrics
    psnr = MetricFactory.compute("psnr", prediction, target_tensor)
    ssim = MetricFactory.compute("ssim", prediction, target_tensor)

    print("\n-------------------------------")
    print(f"L1 Loss : {loss.item():.6f}")
    print(f"PSNR    : {psnr:.4f}")
    print(f"SSIM    : {ssim:.4f}")
    print("-------------------------------")

    print("\n✅ Real Dataset Forward Pass Successful!")


if __name__ == "__main__":
    main()