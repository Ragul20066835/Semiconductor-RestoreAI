"""
Evaluation metrics for semiconductor image restoration.

This module provides registry-based metric utilities for validation and
benchmarking. Metrics operate on ``prediction`` and ``ground_truth`` tensors
with shape ``[B, C, H, W]`` or ``[C, H, W]`` and values in ``[0.0, 1.0]``.

New metrics (e.g. LPIPS) can be registered through ``MetricFactory`` without
changing validation code.

Example
-------
>>> from utils.metrics import MetricFactory, calculate_psnr, calculate_ssim
>>> psnr = calculate_psnr(prediction, target)
>>> metrics = MetricFactory.compute_all(prediction, target)
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, ClassVar, Dict, List, Optional, Sequence, Tuple, Type

import torch
import torch.nn.functional as F
from torch import Tensor

# Default metric set used during validation when none is specified.
DEFAULT_METRIC_NAMES: Tuple[str, ...] = ("psnr", "ssim")


class RestorationMetric(ABC):
    """
    Abstract base class for image restoration evaluation metrics.

    Concrete metrics return a single floating-point score where higher is
    better (PSNR in dB, SSIM in ``[0, 1]``).
    """

    @abstractmethod
    def compute(self, prediction: Tensor, target: Tensor) -> float:
        """
        Compute the metric between prediction and ground truth.

        Parameters
        ----------
        prediction:
            Restored image tensor produced by the model.
        target:
            Ground-truth reference tensor.

        Returns
        -------
        float
            Metric value.
        """
        raise NotImplementedError


class MetricFactory:
    """
    Factory and registry for restoration evaluation metrics.

    Validation code should depend on this factory rather than concrete
    metric classes::

        results = MetricFactory.compute_all(prediction, target)
        psnr = MetricFactory.compute("psnr", prediction, target)

    To add a new metric later (e.g. LPIPS):

    1. Subclass ``RestorationMetric``.
    2. Decorate with ``@MetricFactory.register("lpips")``.
    3. Reference the new name from configuration — no validation-loop changes.
    """

    _registry: ClassVar[Dict[str, Type[RestorationMetric]]] = {}

    @classmethod
    def register(cls, name: str):
        """
        Class decorator that registers a metric implementation under ``name``.

        Parameters
        ----------
        name:
            Case-insensitive identifier used by ``build()`` and ``compute()``.
        """

        def decorator(metric_cls: Type[RestorationMetric]) -> Type[RestorationMetric]:
            normalized_name = name.strip().lower()
            if not normalized_name:
                raise ValueError("Metric name cannot be empty.")

            if not issubclass(metric_cls, RestorationMetric):
                raise TypeError(
                    f"{metric_cls.__name__} must inherit from RestorationMetric."
                )

            if normalized_name in cls._registry:
                raise ValueError(
                    f"Metric '{normalized_name}' is already registered "
                    f"by {cls._registry[normalized_name].__name__}."
                )

            cls._registry[normalized_name] = metric_cls
            return metric_cls

        return decorator

    @classmethod
    def build(cls, name: str, **kwargs: Any) -> RestorationMetric:
        """
        Instantiate a registered metric by name.

        Parameters
        ----------
        name:
            Registered metric identifier (e.g. ``"psnr"``, ``"ssim"``).
        **kwargs:
            Constructor arguments forwarded to the metric class.

        Returns
        -------
        RestorationMetric
            Initialized metric calculator.
        """
        normalized_name = name.strip().lower()
        metric_cls = cls._registry.get(normalized_name)

        if metric_cls is None:
            available = ", ".join(sorted(cls._registry)) or "(none)"
            raise ValueError(
                f"Unknown metric '{name}'. Available metrics: {available}."
            )

        try:
            return metric_cls(**kwargs)
        except TypeError as exc:
            raise TypeError(
                f"Invalid arguments for metric '{normalized_name}' "
                f"({metric_cls.__name__}): {exc}"
            ) from exc

    @classmethod
    def compute(cls, name: str, prediction: Tensor, target: Tensor, **kwargs: Any) -> float:
        """
        Build a metric and compute it in one call.

        Parameters
        ----------
        name:
            Registered metric identifier.
        prediction:
            Model output tensor.
        target:
            Ground-truth tensor.
        **kwargs:
            Constructor arguments forwarded to the metric class.

        Returns
        -------
        float
            Computed metric value.
        """
        metric = cls.build(name, **kwargs)
        return metric.compute(prediction, target)

    @classmethod
    def compute_all(
        cls,
        prediction: Tensor,
        target: Tensor,
        metric_names: Optional[Sequence[str]] = None,
        metric_kwargs: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> Dict[str, float]:
        """
        Compute multiple registered metrics and return a name-to-value mapping.

        Parameters
        ----------
        prediction:
            Model output tensor.
        target:
            Ground-truth tensor.
        metric_names:
            Metric identifiers to compute. Defaults to ``DEFAULT_METRIC_NAMES``.
        metric_kwargs:
            Optional per-metric constructor kwargs, e.g.
            ``{"psnr": {"crop_border": 4}}``.

        Returns
        -------
        dict[str, float]
            Mapping from metric name to computed value.
        """
        names = list(metric_names) if metric_names is not None else list(DEFAULT_METRIC_NAMES)
        kwargs_map = metric_kwargs or {}

        results: Dict[str, float] = {}
        for name in names:
            normalized_name = name.strip().lower()
            metric = cls.build(normalized_name, **kwargs_map.get(normalized_name, {}))
            results[normalized_name] = metric.compute(prediction, target)

        return results

    @classmethod
    def available_metrics(cls) -> List[str]:
        """Return sorted list of registered metric names."""
        return sorted(cls._registry)

    @classmethod
    def is_registered(cls, name: str) -> bool:
        """Return ``True`` if ``name`` corresponds to a registered metric."""
        return name.strip().lower() in cls._registry


@MetricFactory.register("psnr")
class PSNRMetric(RestorationMetric):
    """
    Peak Signal-to-Noise Ratio (PSNR) in decibels.

    Higher values indicate better restoration quality. When prediction and
    target are identical, PSNR returns positive infinity.
    """

    def __init__(
        self,
        data_range: float = 1.0,
        crop_border: int = 0,
    ) -> None:
        """
        Parameters
        ----------
        data_range:
            Dynamic range of the input images. Use ``1.0`` for tensors in
            ``[0, 1]`` (project default) or ``255.0`` for ``[0, 255]`` images.
        crop_border:
            Number of pixels to crop from each spatial edge before computing
            the metric. Useful for super-resolution border effects.
        """
        if data_range <= 0:
            raise ValueError(f"'data_range' must be > 0, got {data_range}.")
        if crop_border < 0:
            raise ValueError(f"'crop_border' must be >= 0, got {crop_border}.")

        self.data_range = data_range
        self.crop_border = crop_border

    def compute(self, prediction: Tensor, target: Tensor) -> float:
        _validate_prediction_target(prediction, target)

        prediction = _prepare_metric_tensor(prediction)
        target = _prepare_metric_tensor(target)

        prediction = _apply_crop_border(prediction, self.crop_border)
        target = _apply_crop_border(target, self.crop_border)

        batch_scores = [
            _psnr_single(prediction[index], target[index], self.data_range)
            for index in range(prediction.shape[0])
        ]

        return float(sum(batch_scores) / len(batch_scores))


@MetricFactory.register("ssim")
class SSIMMetric(RestorationMetric):
    """
    Structural Similarity Index Measure (SSIM).

    Returns values in ``[0, 1]`` where ``1.0`` indicates perfect structural
    similarity. SSIM is computed with an isotropic Gaussian window (size 11,
    sigma 1.5) following the standard Wang et al. formulation.
    """

    def __init__(
        self,
        data_range: float = 1.0,
        crop_border: int = 0,
        window_size: int = 11,
        sigma: float = 1.5,
    ) -> None:
        """
        Parameters
        ----------
        data_range:
            Dynamic range of the input images. Use ``1.0`` for normalized tensors.
        crop_border:
            Pixels cropped from each spatial edge before SSIM computation.
        window_size:
            Size of the Gaussian sliding window. Must be an odd positive integer.
        sigma:
            Standard deviation of the Gaussian window.
        """
        if data_range <= 0:
            raise ValueError(f"'data_range' must be > 0, got {data_range}.")
        if crop_border < 0:
            raise ValueError(f"'crop_border' must be >= 0, got {crop_border}.")
        if window_size < 3 or window_size % 2 == 0:
            raise ValueError(
                f"'window_size' must be an odd integer >= 3, got {window_size}."
            )
        if sigma <= 0:
            raise ValueError(f"'sigma' must be > 0, got {sigma}.")

        self.data_range = data_range
        self.crop_border = crop_border
        self.window_size = window_size
        self.sigma = sigma

    def compute(self, prediction: Tensor, target: Tensor) -> float:
        _validate_prediction_target(prediction, target)

        prediction = _prepare_metric_tensor(prediction)
        target = _prepare_metric_tensor(target)

        prediction = _apply_crop_border(prediction, self.crop_border)
        target = _apply_crop_border(target, self.crop_border)

        if prediction.shape[-1] < self.window_size or prediction.shape[-2] < self.window_size:
            raise ValueError(
                f"Image size {tuple(prediction.shape[-2:])} is smaller than "
                f"SSIM window size {self.window_size}."
            )

        batch_scores = [
            _ssim_single(
                prediction[index],
                target[index],
                data_range=self.data_range,
                window_size=self.window_size,
                sigma=self.sigma,
            )
            for index in range(prediction.shape[0])
        ]

        return float(sum(batch_scores) / len(batch_scores))


def calculate_psnr(
    prediction: Tensor,
    target: Tensor,
    data_range: float = 1.0,
    crop_border: int = 0,
) -> float:
    """
    Compute PSNR between ``prediction`` and ``target``.

    Convenience wrapper around ``PSNRMetric`` for direct use in validation scripts.
    """
    return PSNRMetric(data_range=data_range, crop_border=crop_border).compute(
        prediction, target
    )


def calculate_ssim(
    prediction: Tensor,
    target: Tensor,
    data_range: float = 1.0,
    crop_border: int = 0,
    window_size: int = 11,
    sigma: float = 1.5,
) -> float:
    """
    Compute SSIM between ``prediction`` and ``target``.

    Convenience wrapper around ``SSIMMetric`` for direct use in validation scripts.
    """
    return SSIMMetric(
        data_range=data_range,
        crop_border=crop_border,
        window_size=window_size,
        sigma=sigma,
    ).compute(prediction, target)


def _validate_prediction_target(prediction: Tensor, target: Tensor) -> None:
    """Validate metric inputs before computation."""
    if not isinstance(prediction, Tensor) or not isinstance(target, Tensor):
        raise TypeError("Both prediction and target must be torch.Tensor instances.")

    if prediction.shape != target.shape:
        raise ValueError(
            f"Shape mismatch: prediction {tuple(prediction.shape)} vs "
            f"target {tuple(target.shape)}."
        )

    if prediction.ndim not in (3, 4):
        raise ValueError(
            f"Expected tensor shape [C, H, W] or [B, C, H, W], got {prediction.ndim}D."
        )


def _prepare_metric_tensor(tensor: Tensor) -> Tensor:
    """
    Convert input to a detached float CPU tensor with batch dimension.

    Returns
    -------
    torch.Tensor
        Tensor shaped ``[B, C, H, W]`` in float32.
    """
    if tensor.ndim == 3:
        tensor = tensor.unsqueeze(0)

    return tensor.detach().float().cpu()


def _apply_crop_border(tensor: Tensor, crop_border: int) -> Tensor:
    """Crop ``crop_border`` pixels from each spatial edge."""
    if crop_border == 0:
        return tensor

    height, width = tensor.shape[-2], tensor.shape[-1]
    if 2 * crop_border >= height or 2 * crop_border >= width:
        raise ValueError(
            f"crop_border={crop_border} is too large for spatial size ({height}, {width})."
        )

    return tensor[..., crop_border:-crop_border, crop_border:-crop_border]


def _psnr_single(prediction: Tensor, target: Tensor, data_range: float) -> float:
    """Compute PSNR for a single ``[C, H, W]`` pair."""
    mse = torch.mean((prediction - target) ** 2).item()
    if mse == 0:
        return float("inf")
    return float(20.0 * torch.log10(torch.tensor(data_range)) - 10.0 * torch.log10(torch.tensor(mse)))


def _ssim_single(
    prediction: Tensor,
    target: Tensor,
    data_range: float,
    window_size: int,
    sigma: float,
) -> float:
    """Compute SSIM for a single ``[C, H, W]`` pair."""
    channel_scores: List[float] = []
    window = _create_gaussian_window(window_size, sigma).to(prediction.dtype)

    c1 = (0.01 * data_range) ** 2
    c2 = (0.03 * data_range) ** 2

    for channel in range(prediction.shape[0]):
        pred_channel = prediction[channel : channel + 1].unsqueeze(0)
        target_channel = target[channel : channel + 1].unsqueeze(0)

        mu_pred = F.conv2d(pred_channel, window, padding=window_size // 2)
        mu_target = F.conv2d(target_channel, window, padding=window_size // 2)

        mu_pred_sq = mu_pred ** 2
        mu_target_sq = mu_target ** 2
        mu_pred_target = mu_pred * mu_target

        sigma_pred_sq = F.conv2d(pred_channel ** 2, window, padding=window_size // 2) - mu_pred_sq
        sigma_target_sq = F.conv2d(target_channel ** 2, window, padding=window_size // 2) - mu_target_sq
        sigma_pred_target = F.conv2d(pred_channel * target_channel, window, padding=window_size // 2) - mu_pred_target

        numerator = (2.0 * mu_pred_target + c1) * (2.0 * sigma_pred_target + c2)
        denominator = (mu_pred_sq + mu_target_sq + c1) * (sigma_pred_sq + sigma_target_sq + c2)
        ssim_map = numerator / denominator

        channel_scores.append(float(ssim_map.mean().item()))

    return float(sum(channel_scores) / len(channel_scores))


def _create_gaussian_window(window_size: int, sigma: float) -> Tensor:
    """Create a 2D Gaussian kernel shaped ``[1, 1, window_size, window_size]``."""
    coords = torch.arange(window_size, dtype=torch.float32) - window_size // 2
    gaussian_1d = torch.exp(-(coords ** 2) / (2.0 * sigma ** 2))
    gaussian_1d = gaussian_1d / gaussian_1d.sum()
    gaussian_2d = gaussian_1d[:, None] @ gaussian_1d[None, :]
    return gaussian_2d.unsqueeze(0).unsqueeze(0)
