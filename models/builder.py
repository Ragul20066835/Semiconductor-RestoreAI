"""
SwinIR model construction for semiconductor image super-resolution.

This module provides a single entry point for building a SwinIR network with
fully configurable hyperparameters. It wraps the official architecture defined
in ``network_swinir.py`` without adding training or inference logic.

Default settings target **2× grayscale super-resolution** for paired
``NoisyLR`` → ``GT`` NumPy datasets (e.g. ``128×128`` input to ``256×256`` output).
"""

from __future__ import annotations

from typing import List, Optional, Sequence

import torch.nn as nn

from models.network_swinir import SwinIR

# Valid upsampler modes supported by the official SwinIR implementation.
UpsamplerType = str  # "", "pixelshuffle", "pixelshuffledirect", "nearest+conv"
ResiConnectionType = str  # "1conv", "3conv"


def build_swinir(
    *,
    img_size: int = 128,
    patch_size: int = 1,
    in_chans: int = 1,
    embed_dim: int = 60,
    depths: Sequence[int] = (2, 2, 2, 2),
    num_heads: Sequence[int] = (2, 2, 2, 2),
    window_size: int = 8,
    mlp_ratio: float = 2.0,
    qkv_bias: bool = True,
    qk_scale: Optional[float] = None,
    drop_rate: float = 0.0,
    attn_drop_rate: float = 0.0,
    drop_path_rate: float = 0.1,
    ape: bool = False,
    patch_norm: bool = True,
    use_checkpoint: bool = False,
    upscale: int = 2,
    img_range: float = 1.0,
    upsampler: UpsamplerType = "pixelshuffle",
    resi_connection: ResiConnectionType = "1conv",
) -> SwinIR:
    """
    Build and return a SwinIR model with the given hyperparameters.

    Defaults are chosen for **2× grayscale super-resolution** with
    ``upscale=2``, ``upsampler="pixelshuffle"``, and ``in_chans=1``, matching
    the paired ``NoisyLR`` → ``GT`` NumPy dataset used in this project.

    Parameters
    ----------
    img_size:
        Training patch size used to configure the internal buffer size.
        Should match the low-resolution patch size used during training
        (e.g. ``128`` for ``256×256`` ground-truth targets at 2× scale).
    patch_size:
        Patch token size for the patch embedding layer. Default ``1`` for
        pixel-level restoration (standard for SwinIR).
    in_chans:
        Number of input channels. Use ``1`` for grayscale SEM images.
    embed_dim:
        Embedding dimension for transformer tokens.
    depths:
        Number of Swin Transformer blocks in each residual group (RSTB).
        Length determines the number of RSTB stages.
    num_heads:
        Attention head count per RSTB stage. Must have the same length as
        ``depths``.
    window_size:
        Local self-attention window size. Input spatial dimensions should be
        padded to a multiple of this value at inference time.
    mlp_ratio:
        Ratio of MLP hidden dimension to embedding dimension.
    qkv_bias:
        Whether to include bias terms in Q/K/V projections.
    qk_scale:
        Optional override for attention scale. ``None`` uses ``head_dim ** -0.5``.
    drop_rate:
        Dropout rate applied after patch embedding.
    attn_drop_rate:
        Dropout rate applied on attention weights.
    drop_path_rate:
        Stochastic depth rate for residual paths.
    ape:
        Whether to use absolute positional embedding.
    patch_norm:
        Whether to apply layer normalization after patch embedding.
    use_checkpoint:
        Enable gradient checkpointing inside transformer blocks to reduce
        memory usage during training.
    upscale:
        Spatial upscaling factor. Default ``2`` for 2× super-resolution.
        Also supports ``3``, ``4``, or ``8`` for other SR tasks; use ``1`` only
        for same-resolution restoration.
    img_range:
        Expected input value range scaling factor. Use ``1.0`` when inputs are
        normalized to ``[0, 1]``; use ``255.0`` for JPEG artifact reduction tasks.
    upsampler:
        Reconstruction head type:

        - ``"pixelshuffle"``: classical super-resolution (project default for 2× SR)
        - ``"pixelshuffledirect"``: lightweight super-resolution
        - ``"nearest+conv"``: real-world super-resolution
        - ``""`` (empty string): same-resolution restoration / denoising only
    resi_connection:
        Convolution style before the residual connection inside each RSTB.
        Either ``"1conv"`` or ``"3conv"``.

    Returns
    -------
    SwinIR
        An uninitialized (randomly initialized) SwinIR model ready for training
        or checkpoint loading.

    Raises
    ------
    ValueError
        If hyperparameter combinations are invalid.
    """
    depths_list = _validate_int_sequence(depths, name="depths")
    num_heads_list = _validate_int_sequence(num_heads, name="num_heads")

    if len(depths_list) != len(num_heads_list):
        raise ValueError(
            f"'depths' and 'num_heads' must have the same length, "
            f"got {len(depths_list)} and {len(num_heads_list)}."
        )

    _validate_upsampler(upscale=upscale, upsampler=upsampler)
    _validate_resi_connection(resi_connection)

    if in_chans < 1:
        raise ValueError(f"'in_chans' must be >= 1, got {in_chans}.")

    if img_size < 1:
        raise ValueError(f"'img_size' must be >= 1, got {img_size}.")

    if window_size < 1:
        raise ValueError(f"'window_size' must be >= 1, got {window_size}.")

    model = SwinIR(
        img_size=img_size,
        patch_size=patch_size,
        in_chans=in_chans,
        embed_dim=embed_dim,
        depths=depths_list,
        num_heads=num_heads_list,
        window_size=window_size,
        mlp_ratio=mlp_ratio,
        qkv_bias=qkv_bias,
        qk_scale=qk_scale,
        drop_rate=drop_rate,
        attn_drop_rate=attn_drop_rate,
        drop_path_rate=drop_path_rate,
        norm_layer=nn.LayerNorm,
        ape=ape,
        patch_norm=patch_norm,
        use_checkpoint=use_checkpoint,
        upscale=upscale,
        img_range=img_range,
        upsampler=upsampler,
        resi_connection=resi_connection,
    )

    return model


def _validate_int_sequence(values: Sequence[int], name: str) -> List[int]:
    """Ensure a sequence of positive integers is provided."""
    if not values:
        raise ValueError(f"'{name}' must be a non-empty sequence of integers.")

    validated = []
    for index, value in enumerate(values):
        if not isinstance(value, int) or isinstance(value, bool):
            raise TypeError(f"'{name}[{index}]' must be an int, got {type(value).__name__}.")
        if value < 1:
            raise ValueError(f"'{name}[{index}]' must be >= 1, got {value}.")
        validated.append(value)

    return validated


def _validate_upsampler(*, upscale: int, upsampler: UpsamplerType) -> None:
    """Validate upsampler string and its compatibility with upscale factor."""
    allowed = {"", "pixelshuffle", "pixelshuffledirect", "nearest+conv"}
    if upsampler not in allowed:
        raise ValueError(
            f"Invalid upsampler '{upsampler}'. "
            f"Choose from {sorted(allowed)}."
        )

    if upscale < 1:
        raise ValueError(f"'upscale' must be >= 1, got {upscale}.")

    # Denoising / same-resolution restoration uses an empty upsampler string.
    if upscale == 1 and upsampler != "":
        raise ValueError(
            "For upscale=1 (denoising / restoration), upsampler must be an empty string ''."
        )

    if upscale > 1 and upsampler == "":
        raise ValueError(
            f"For upscale={upscale}, upsampler cannot be empty. "
            "Use 'pixelshuffle', 'pixelshuffledirect', or 'nearest+conv'."
        )


def _validate_resi_connection(resi_connection: ResiConnectionType) -> None:
    """Validate residual connection block type."""
    allowed = {"1conv", "3conv"}
    if resi_connection not in allowed:
        raise ValueError(
            f"Invalid resi_connection '{resi_connection}'. "
            f"Choose from {sorted(allowed)}."
        )
