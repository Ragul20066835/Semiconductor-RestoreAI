# Semiconductor-RestoreAI: SwinIR-based Image Super-Resolution and Restoration

Semiconductor-RestoreAI is a deep learning project utilizing the **SwinIR** (Image Restoration Using Swin Transformer) architecture for **2× Super-Resolution** and denoising of grayscale semiconductor images. The project is fully end-to-end, supporting custom dataset loading of NumPy arrays, training, validation, checkpoint tracking, and robust inference with both standard images and `.npy` formats.

---

## Features

- **SwinIR Architecture**: Leverages state-of-the-art Swin Transformer models configured specifically for image restoration.
- **Support for NumPy Arrays (`.npy`)**: Seamlessly handles raw float32 matrices (which are common in scientific and industrial microscopy imaging) in dataset loading, model inference, and output saving.
- **Grayscale Super-Resolution**: Built for single-channel restoration with 2× upscale factors.
- **Robust Pipeline**: Includes training, validation, metric evaluation (PSNR and SSIM), and checkpoint tracking (`best.pt` and `latest.pt`).
- **Dual-Format Inference Output**: Automatically saves restorations as both `.png` (for visualization) and `.npy` (for scientific analysis/raw values).
- **Visualization Suite**: Provides side-by-side visual comparisons between low-resolution inputs and restored high-resolution outputs.

---

## Folder Structure

```
Semiconductor-RestoreAI/
│
├── models/
│   ├── builder.py            # Helper module to construct SwinIR with specific parameters
│   └── network_swinir.py     # Core SwinIR neural network architecture
│
├── utils/
│   ├── dataset.py            # Paired image/array dataset loader (loads .npy files)
│   ├── losses.py             # Restoration losses (supports registry system)
│   └── metrics.py            # Metric calculations (PSNR and SSIM computations)
│
├── dataset/                  # Dataset directory (Git ignored)
│   ├── train/
│   │   ├── GT/               # Ground-truth clean high-resolution arrays (.npy)
│   │   └── NoisyLR/          # Noisy low-resolution inputs (.npy)
│   ├── val/
│   │   ├── GT/               # Validation clean high-resolution arrays (.npy)
│   │   └── NoisyLR/          # Validation noisy low-resolution inputs (.npy)
│   └── test/
│       └── NoisyLR/          # Test noisy low-resolution inputs (.npy)
│
├── outputs/                  # Training runs, checkpoints, and restored images (Git ignored)
│   ├── experiment/
│   │   └── checkpoints/
│   │       ├── best.pt       # Checkpoint with the best validation PSNR
│   │       └── latest.pt     # The most recent epoch's checkpoint
│   └── restored/             # Folder containing restoration outputs
│       ├── 003181.png        # Restored visual output
│       ├── 003181.npy        # Restored float32 matrix
│       └── comparison.png    # Side-by-side comparison figure
│
├── check_npy.py              # Utility to inspect dataset array dimensions and statistics
├── compare_result.py         # Visual comparison generator script
├── inference.py              # Main inference script for running restorations
├── train.py                  # End-to-end training and validation script
├── test_project.py           # Project components smoke test
├── test_dataset_forward.py   # Dataset loading and single forward pass test
│
├── requirements.txt          # Python packages requirements list
├── .gitignore                # Standard file exclusion rules for git
└── README.md                 # Project documentation
```

---

## Installation

Ensure you have Python 3.8+ installed. You can install all project dependencies via `pip`:

```bash
pip install -r requirements.txt
```

---

## Dataset Format

This project is configured to use paired NumPy binary files (`.npy`) for training. 
- The low-resolution inputs (`NoisyLR`) must match their clean ground-truth (`GT`) counter-parts by filename (e.g. `000001.npy`).
- Dimensions:
  - **NoisyLR inputs**: Shape `(H, W)` or `(1, H, W)`. Grayscale.
  - **GT ground-truth**: Shape `(2H, 2W)` or `(1, 2H, 2W)`. Grayscale (2× size).

---

## Training Command

To start training the SwinIR model from scratch:

```bash
python train.py \
    --train-dir dataset/train \
    --val-dir dataset/val \
    --output-dir outputs/experiment \
    --epochs 100 \
    --batch-size 4 \
    --patch-size 128
```

You can change CLI options (e.g., `--device cuda` or `--device cpu`) to control the hardware acceleration.

---

## Inference Command

To restore a low-resolution `.npy` array (or standard image format) using a trained checkpoint:

```bash
python inference.py \
    --checkpoint outputs/experiment/checkpoints/best.pt \
    --input dataset/test/NoisyLR/003181.npy \
    --output outputs/restored/003181.png
```

*Note: This command automatically generates both `outputs/restored/003181.png` and `outputs/restored/003181.npy`.*

---

## Comparison Command

To generate a side-by-side comparison between the original input and the restored output:

```bash
python compare_result.py
```

This will upscale the original 128×128 input via nearest-neighbor interpolation (for visual scaling matching) and display it next to the restored 256×256 output, saving the visual result to `outputs/restored/comparison.png`.

---

## Example Results

When running the comparison script, the resulting figure is saved as `outputs/restored/comparison.png`:
- **Left Pane**: Original NoisyLR (128×128) - displays raw input with noise and low spatial details.
- **Right Pane**: Restored Output (256×256) - displays the sharp, denoised, super-resolved result.

---

## Technologies Used

- **Deep Learning Framework**: PyTorch
- **Model Architecture**: Swin Transformer / SwinIR
- **Scientific Computing**: NumPy, Scikit-Image, Timm
- **Image Processing**: Pillow (PIL)
- **Data Visualization**: Matplotlib

---

## Future Improvements

- **Colab Notebook**: Integrate Google Colab workspace mapping and train directly on free/Pro T4/A100 GPU instances.
- **Perceptual Loss**: Implement VGG-based perceptual losses for sharper edge definition.
- **Different Scale Factors**: Support 4× and 8x upscale factors with progressive reconstruction.

---

## License

This project is licensed under the Apache License 2.0. See the `LICENSE` file for more details.
