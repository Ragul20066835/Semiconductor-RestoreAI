"""
Smoke test for Semiconductor RestoreAI.

Verifies that core project modules import correctly and work together
through a single forward pass, loss computation, and metric evaluation.

No training, dataset loading, checkpointing, or inference is performed.
"""

from __future__ import annotations

import torch

from models.builder import build_swinir
from utils.dataset import SemiconductorRestorationDataset
from utils.losses import LossFactory
from utils.metrics import MetricFactory


def count_trainable_parameters(model: torch.nn.Module) -> int:
    """Return the number of trainable model parameters."""
    return sum(parameter.numel() for parameter in model.parameters() if parameter.requires_grad)


def main() -> None:
    print("=" * 60)
    print("Semiconductor RestoreAI - Project Smoke Test")
    print("=" * 60)

    # Verify dataset module import (no images loaded).
    print(f"\n[OK] Imported SemiconductorRestorationDataset: {SemiconductorRestorationDataset.__name__}")
    print(f"[OK] Imported build_swinir: {build_swinir.__name__}")
    print(f"[OK] Imported LossFactory: {LossFactory.__name__}")
    print(f"[OK] Imported MetricFactory: {MetricFactory.__name__}")

    # Build model.
    model = build_swinir()
    model.eval()

    total_params = count_trainable_parameters(model)
    print(f"\nModel: SwinIR")
    print(f"Total trainable parameters: {total_params:,} ({total_params / 1e6:.2f}M)")

    # Dummy input tensor [B, C, H, W] = [1, 1, 128, 128].
    dummy_input = torch.rand(1, 1, 128, 128)
    dummy_target = torch.rand(1, 1, 256,256)

    print(f"\nDummy input shape:  {tuple(dummy_input.shape)}")
    print(f"Dummy target shape: {tuple(dummy_target.shape)}")

    # Forward pass.
    with torch.no_grad():
        prediction = model(dummy_input)

    print(f"Prediction shape:   {tuple(prediction.shape)}")

    # Loss computation.
    criterion = LossFactory.build("l1")
    loss = criterion(prediction, dummy_target)
    loss_value = float(loss.item())

    # Metric computation.
    psnr_value = MetricFactory.compute("psnr", prediction, dummy_target)
    ssim_value = MetricFactory.compute("ssim", prediction, dummy_target)

    print("\n--- Pipeline Outputs ---")
    print(f"L1 Loss: {loss_value:.6f}")
    print(f"PSNR:    {psnr_value:.4f} dB")
    print(f"SSIM:    {ssim_value:.4f}")

    print("\nSmoke Test Passed Successfully")


if __name__ == "__main__":
    main()
