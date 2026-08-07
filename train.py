"""
TTraining engine for 2× semiconductor image super-resolution with SwinIR.
 
This script wires together the dataset loader, model builder, loss factory,
and metric factory into a complete training pipeline. It supports epoch-wise
training, validation, checkpointing, and PSNR/SSIM logging.
 
Example
-------
python train.py \\
    --train-dir dataset/train \\
    --val-dir dataset/val \\
    --output-dir outputs/sem_restore_v1 \\
    --epochs 100 \\
    --batch-size 4 \\
    --patch-size 128
"""
 
from __future__ import annotations
 
import argparse
import logging
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple
 
import numpy as np
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.utils.data import DataLoader, Subset
 
from models.builder import build_swinir
from utils.dataset import SemiconductorRestorationDataset
from utils.losses import DEFAULT_LOSS_NAME, LossFactory
from utils.metrics import MetricFactory
 
LOGGER = logging.getLogger("semiconductor_restoreai.train")
 
 
@dataclass
class EpochMetrics:
    """Container for training and validation results of one epoch."""
 
    epoch: int
    train_loss: float
    val_loss: float
    psnr: float
    ssim: float
 
 
class SuperResolutionRandomCrop:
    """
    Random crop for paired Super-Resolution images.
 
    LR crop size = patch_size
    GT crop size = patch_size * upscale
    """
 
    def __init__(self, patch_size: int, upscale: int = 2) -> None:
        self.patch_size = patch_size
        self.upscale = upscale
 
    def __call__(self, input_tensor, gt_tensor):
 
        _, h, w = input_tensor.shape
 
        if h < self.patch_size or w < self.patch_size:
            raise ValueError(
                f"Input image ({h}x{w}) is smaller than patch size ({self.patch_size})."
            )
 
        top = random.randint(0, h - self.patch_size)
        left = random.randint(0, w - self.patch_size)
 
        input_crop = input_tensor[
            :,
            top:top + self.patch_size,
            left:left + self.patch_size,
        ]
 
        gt_top = top * self.upscale
        gt_left = left * self.upscale
        gt_size = self.patch_size * self.upscale
 
        gt_crop = gt_tensor[
            :,
            gt_top:gt_top + gt_size,
            gt_left:gt_left + gt_size,
        ]
 
        return input_crop, gt_crop
 
 
class Trainer:
    """
    Orchestrates SwinIR training, validation, logging, and checkpointing.
 
    Parameters
    ----------
    args:
        Parsed command-line arguments produced by ``parse_args()``.
    """
 
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.device = _resolve_device(args.device)
        self.output_dir = Path(args.output_dir)
        self.checkpoint_dir = self.output_dir / "checkpoints"
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
 
        _set_seed(args.seed)
 
        self.model = self._build_model().to(self.device)
        self.criterion = LossFactory.build(args.loss_name).to(self.device)
        self.optimizer = AdamW(
            self.model.parameters(),
            lr=args.learning_rate,
            weight_decay=args.weight_decay,
        )
 
        self.train_loader = self._build_dataloader(
            args.train_dir,
            batch_size=args.batch_size,
            shuffle=True,
            transform=SuperResolutionRandomCrop(
                patch_size=args.patch_size,
                upscale=args.upscale,
            ),
        )
        self.val_loader = self._build_dataloader(
            args.val_dir,
            batch_size=1,
            shuffle=False,
            transform=None,
        )
 
        self.start_epoch = 0
        self.start_step = 0
        self.global_step = 0
        self.running_loss = 0.0
        self.best_psnr = float("-inf")
        self.best_ssim = float("-inf")

        # Check resume priority
        resume_path = None
        if args.resume:
            resume_path = Path(args.resume)
        else:
            step_path = self.checkpoint_dir / "step_checkpoint.pt"
            latest_path = self.checkpoint_dir / "latest.pt"

            if step_path.is_file():
                try:
                    checkpoint = _safe_load(step_path, "cpu")
                    resume_path = step_path
                except Exception as e:
                    LOGGER.warning("Step checkpoint at %s is corrupted: %s. Falling back to latest.pt", step_path, e)
                    if latest_path.is_file():
                        resume_path = latest_path
            elif latest_path.is_file():
                resume_path = latest_path

        if resume_path is not None:
            self._load_checkpoint(resume_path)
 
        LOGGER.info("Device: %s", self.device)
        LOGGER.info("Train samples: %d", len(self.train_loader.dataset))
        LOGGER.info("Validation samples: %d", len(self.val_loader.dataset))
        LOGGER.info(
            "Model parameters: %s",
            f"{sum(p.numel() for p in self.model.parameters()) / 1e6:.2f}M",
        )
 
    def train(self) -> None:
        """Run the full training loop."""
        for epoch in range(self.start_epoch, self.args.epochs):
            train_loss = self._train_one_epoch(epoch)
            val_loss, val_metrics = self._validate(epoch)
 
            epoch_metrics = EpochMetrics(
                epoch=epoch + 1,
                train_loss=train_loss,
                val_loss=val_loss,
                psnr=val_metrics["psnr"],
                ssim=val_metrics["ssim"],
            )

            if val_metrics["ssim"] > self.best_ssim:
                self.best_ssim = val_metrics["ssim"]

            self._log_epoch(epoch_metrics)
            self._save_checkpoints(epoch + 1, epoch_metrics)
 
        LOGGER.info("Training complete. Best PSNR: %.4f dB", self.best_psnr)
 
    def _build_model(self) -> nn.Module:
        """Instantiate SwinIR using project model builder defaults."""
        return build_swinir(
            img_size=self.args.patch_size,
            in_chans=self.args.in_chans,
            embed_dim=self.args.embed_dim,
            depths=tuple(self.args.depths),
            num_heads=tuple(self.args.num_heads),
            window_size=self.args.window_size,
            upscale=self.args.upscale,
            upsampler=self.args.upsampler,
        )
 
    def _build_dataloader(
        self,
        data_dir: str,
        batch_size: int,
        shuffle: bool,
        transform: Optional[SuperResolutionRandomCrop],
    ) -> DataLoader:
        """Create a DataLoader for a dataset split."""
        dataset = SemiconductorRestorationDataset(data_dir, transform=transform)
        if shuffle and self.args.max_train_samples is not None:
            dataset = Subset(
                dataset,
                range(min(len(dataset), self.args.max_train_samples)),
            )
        if not shuffle and self.args.max_val_samples is not None:
            dataset = Subset(
                dataset,
                range(min(len(dataset), self.args.max_val_samples)),
            )
 
        return DataLoader(
            dataset,
            batch_size=batch_size,
            shuffle=shuffle,
            num_workers=self.args.num_workers,
            pin_memory=self.device.type == "cuda",
        )
 
    def _train_one_epoch(self, epoch: int) -> float:
        """Run one training epoch and return the average loss."""
        self.model.train()
        running_loss = self.running_loss
 
        for batch_index, (inputs, targets) in enumerate(self.train_loader):
            if batch_index < self.start_step:
                continue

            inputs = inputs.to(self.device, non_blocking=True)
            targets = targets.to(self.device, non_blocking=True)
 
            self.optimizer.zero_grad(set_to_none=True)
            predictions = self.model(inputs)
            loss = self.criterion(predictions, targets)
            loss.backward()
            self.optimizer.step()
 
            running_loss += loss.item()
            self.global_step += 1
 
            if (batch_index + 1) % self.args.log_interval == 0:
                LOGGER.info(
                    "Epoch [%d/%d] Step [%d/%d] Loss: %.6f",
                    epoch + 1,
                    self.args.epochs,
                    batch_index + 1,
                    len(self.train_loader),
                    loss.item(),
                )

            if self.global_step % self.args.step_checkpoint_interval == 0:
                self._save_step_checkpoint(epoch, batch_index, running_loss)
 
        epoch_loss = running_loss / max(len(self.train_loader), 1)
        self.start_step = 0
        self.running_loss = 0.0
        return epoch_loss
 
    @torch.no_grad()
    def _validate(self, epoch: int) -> Tuple[float, Dict[str, float]]:
        """Run validation and return average loss plus PSNR/SSIM metrics."""
        self.model.eval()
        running_loss = 0.0
        psnr_total = 0.0
        ssim_total = 0.0
        num_batches = 0
 
        for inputs, targets in self.val_loader:
            inputs = inputs.to(self.device, non_blocking=True)
            targets = targets.to(self.device, non_blocking=True)
 
            predictions = self.model(inputs)
            loss = self.criterion(predictions, targets)
            running_loss += loss.item()
 
            batch_metrics = MetricFactory.compute_all(predictions, targets)
            psnr_total += batch_metrics["psnr"]
            ssim_total += batch_metrics["ssim"]
            num_batches += 1
 
        if num_batches == 0:
            raise RuntimeError("Validation dataloader is empty.")
 
        avg_loss = running_loss / num_batches
        avg_metrics = {
            "psnr": psnr_total / num_batches,
            "ssim": ssim_total / num_batches,
        }
 
        LOGGER.info(
            "Validation Epoch [%d/%d] Loss: %.6f | PSNR: %.4f dB | SSIM: %.4f",
            epoch + 1,
            self.args.epochs,
            avg_loss,
            avg_metrics["psnr"],
            avg_metrics["ssim"],
        )
 
        return avg_loss, avg_metrics
 
    def _save_checkpoints(self, epoch: int, metrics: EpochMetrics) -> None:
        """Save latest checkpoint and best checkpoint (by PSNR)."""
        checkpoint = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "best_psnr": self.best_psnr,
            "best_ssim": self.best_ssim,
            "metrics": {
                "train_loss": metrics.train_loss,
                "val_loss": metrics.val_loss,
                "psnr": metrics.psnr,
                "ssim": metrics.ssim,
            },
            "args": vars(self.args),
        }
 
        latest_path = self.checkpoint_dir / "latest.pt"
        print("Saving latest checkpoint...")
        sys.stdout.flush()
        torch.save(checkpoint, latest_path)
        LOGGER.info("Saved latest checkpoint: %s", latest_path)
 
        if metrics.psnr > self.best_psnr:
            self.best_psnr = metrics.psnr
            checkpoint["best_psnr"] = self.best_psnr
 
            best_path = self.checkpoint_dir / "best.pt"
            print("Saving best checkpoint...")
            sys.stdout.flush()
            torch.save(checkpoint, best_path)
            LOGGER.info(
                "New best checkpoint saved: %s (PSNR: %.4f dB)",
                best_path,
                metrics.psnr,
            )
 
    def _load_checkpoint(self, checkpoint_path: Path) -> None:
        """Restore model, optimizer, and training progress from a checkpoint."""
        if not checkpoint_path.is_file():
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")
 
        checkpoint = _safe_load(checkpoint_path, self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])

        if "scheduler_state_dict" in checkpoint and checkpoint["scheduler_state_dict"] is not None:
            if getattr(self, "scheduler", None) is not None:
                self.scheduler.load_state_dict(checkpoint["scheduler_state_dict"])

        if "current_epoch" in checkpoint:
            self.start_epoch = int(checkpoint["current_epoch"]) - 1
        else:
            self.start_epoch = int(checkpoint.get("epoch", 0))

        if "current_step" in checkpoint:
            self.start_step = int(checkpoint["current_step"])
            print("Loaded step checkpoint:")
            print(f"Epoch: {checkpoint['current_epoch']}")
            print(f"Step: {checkpoint['current_step']}")
            sys.stdout.flush()
        else:
            self.start_step = 0

        self.global_step = int(checkpoint.get("global_step", self.start_epoch * len(self.train_loader)))
        self.running_loss = float(checkpoint.get("running_loss", 0.0))
        self.best_psnr = float(checkpoint.get("best_psnr", float("-inf")))
        if "best_ssim" in checkpoint and checkpoint["best_ssim"] is not None:
            self.best_ssim = float(checkpoint["best_ssim"])

        if "random_state" in checkpoint:
            random.setstate(checkpoint["random_state"])
        if "np_random_state" in checkpoint:
            np.random.set_state(checkpoint["np_random_state"])
        if "torch_random_state" in checkpoint:
            torch.set_rng_state(checkpoint["torch_random_state"].cpu())
        if (
    torch.cuda.is_available()
    and "torch_cuda_random_state" in checkpoint
    and checkpoint["torch_cuda_random_state"] is not None
):
 try:
  states = checkpoint["torch_cuda_random_state"]
  if isinstance(states, list):
   torch.cuda.set_rng_state_all(states)
  else:
   torch.cuda.set_rng_state(states)
 except Exception as e:
  LOGGER.warning(
   "Skipping CUDA RNG state restore: %s",
   e,
  )
 
        LOGGER.info(
            "Resumed from checkpoint '%s' at epoch %d (best PSNR: %.4f dB).",
            checkpoint_path,
            self.start_epoch + 1,
            self.best_psnr,
        )

    def _save_step_checkpoint(self, epoch: int, batch_index: int, running_loss: float) -> None:
        """Save a step checkpoint atomically."""
        checkpoint = {
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "scheduler_state_dict": self.scheduler.state_dict() if getattr(self, "scheduler", None) is not None else None,
            "current_epoch": epoch + 1,
            "current_step": batch_index + 1,
            "global_step": self.global_step,
            "running_loss": running_loss,
            "best_psnr": self.best_psnr,
            "best_ssim": self.best_ssim,
            "random_state": random.getstate(),
            "np_random_state": np.random.get_state(),
            "torch_random_state": torch.get_rng_state(),
            "torch_cuda_random_state": torch.cuda.get_rng_state_all() if torch.cuda.is_available() else None,
        }

        temp_path = self.checkpoint_dir / "step_checkpoint.tmp"
        final_path = self.checkpoint_dir / "step_checkpoint.pt"
        final_path.parent.mkdir(parents=True, exist_ok=True)

        print("Saving step checkpoint...")
        print(f"Epoch {epoch + 1} Step {batch_index + 1}")
        sys.stdout.flush()

        try:
            torch.save(checkpoint, temp_path)
            import os
            os.replace(str(temp_path), str(final_path))
        except Exception as e:
            LOGGER.error("Failed to save step checkpoint: %s", e)
 
    def _log_epoch(self, metrics: EpochMetrics) -> None:
        """Log epoch-level training and validation summary."""
        LOGGER.info(
            "Epoch %d Summary | Train Loss: %.6f | Val Loss: %.6f | "
            "PSNR: %.4f dB | SSIM: %.4f",
            metrics.epoch,
            metrics.train_loss,
            metrics.val_loss,
            metrics.psnr,
            metrics.ssim,
        )
 
 
def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    """Parse command-line arguments for the training script."""
    parser = argparse.ArgumentParser(
        description="Train SwinIR for 2× semiconductor image super-resolution.",
    )
 
    # Data paths
    parser.add_argument(
        "--train-dir",
        type=str,
        default="dataset/train",
        help="Path to training split containing GT/ and NoisyLR/ folders.",
    )
    parser.add_argument(
        "--val-dir",
        type=str,
        default="dataset/val",
        help="Path to validation split containing GT/ and NoisyLR/ folders.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="outputs/experiment",
        help="Directory for checkpoints and logs.",
    )
 
    # Training hyperparameters
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs.")
    parser.add_argument("--batch-size", type=int, default=4, help="Training batch size.")
    parser.add_argument("--patch-size", type=int, default=128, help="Random crop size for training.")
    parser.add_argument("--learning-rate", type=float, default=2e-4, help="AdamW learning rate.")
    parser.add_argument("--weight-decay", type=float, default=1e-4, help="AdamW weight decay.")
    parser.add_argument(
        "--loss-name",
        type=str,
        default=DEFAULT_LOSS_NAME,
        help=f"Loss identifier registered in LossFactory (default: {DEFAULT_LOSS_NAME}).",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility.")
    parser.add_argument(
        "--max-train-samples",
        type=int,
        default=None,
        help="Limit number of training samples for debugging.",
    )
    parser.add_argument(
        "--max-val-samples",
        type=int,
        default=None,
        help="Limit number of validation samples for debugging.",
    )
    parser.add_argument(
    "--num-workers",
    type=int,
    default=0,
    help="DataLoader worker processes.",
    )

    parser.add_argument(
    "--log-interval",
    type=int,
    default=10,
    help="Print training loss every N batches.",
    )
    
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        choices=["auto", "cpu", "cuda"],
        help="Computation device.",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default="",
        help="Optional checkpoint path to resume training.",
    )
    parser.add_argument(
        "--step-checkpoint-interval",
        type=int,
        default=200,
        help="Save a step checkpoint every N iterations.",
    )
 
    # Model hyperparameters (forwarded to build_swinir)
    parser.add_argument("--in-chans", type=int, default=1, help="Input channels (1=grayscale).")
    parser.add_argument("--embed-dim", type=int, default=180, help="SwinIR embedding dimension.")
 
    parser.add_argument(
        "--depths",
        type=int,
        nargs="+",
        default=[6,6,6,6,6,6],
        help="Number of transformer blocks per RSTB stage.",
    )
    parser.add_argument(
        "--num-heads",
        type=int,
        nargs="+",
        default=[6,6,6,6,6,6],
        help="Attention heads per RSTB stage.",
    )
    parser.add_argument("--window-size", type=int, default=8, help="Swin attention window size.")
    parser.add_argument("--upscale", type=int, default=2, help="Output upscale factor.")
    parser.add_argument(
        "--upsampler",
        type=str,
        default="pixelshuffle",
        help="SwinIR upsampler mode for 2× super-resolution.",
    )
 
    return parser.parse_args(argv)
 
 
def _configure_logging(output_dir: Path) -> None:
    """Configure console and file logging."""
    output_dir.mkdir(parents=True, exist_ok=True)
    log_file = output_dir / "train.log"
 
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, mode="a", encoding="utf-8"),
        ],
    )
 
 
def _safe_load(checkpoint_path: Path, device: torch.device | str) -> dict:
    """Load a torch checkpoint safely, setting weights_only=False if supported."""
    import inspect
    sig = inspect.signature(torch.load)
    load_kwargs = {}
    if "weights_only" in sig.parameters:
        load_kwargs["weights_only"] = False
    return torch.load(checkpoint_path, map_location=device, **load_kwargs)


def _resolve_device(device_arg: str) -> torch.device:
    """Resolve the torch device from CLI input."""
    if device_arg == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device_arg == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is not available.")
    return torch.device(device_arg)
 
 
def _set_seed(seed: int) -> None:
    """Set random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
 
 
def _pad_pair_to_min_size(
    input_tensor: torch.Tensor,
    gt_tensor: torch.Tensor,
    min_size: int,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Reflect-pad paired tensors so both spatial dimensions are at least ``min_size``.
    """
    _, height, width = input_tensor.shape
    pad_h = max(0, min_size - height)
    pad_w = max(0, min_size - width)
 
    if pad_h == 0 and pad_w == 0:
        return input_tensor, gt_tensor
 
    # F.pad expects (left, right, top, bottom) for last two dimensions.
    padding = (0, pad_w, 0, pad_h)
    input_padded = torch.nn.functional.pad(input_tensor, padding, mode="reflect")
    gt_padded = torch.nn.functional.pad(gt_tensor, padding, mode="reflect")
    return input_padded, gt_padded
 
 
def main(argv: Optional[list[str]] = None) -> None:
    """Entry point for the training script."""
    args = parse_args(argv)
    _configure_logging(Path(args.output_dir))
 
    trainer = Trainer(args)
    trainer.train()
 
 
if __name__ == "__main__":
    main()
 
