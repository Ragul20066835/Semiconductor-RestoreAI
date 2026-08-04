"""
Loss functions for semiconductor image restoration.

This module provides a registry-based ``LossFactory`` so the training loop can
create loss functions by name without knowing implementation details. New loss
types (Charbonnier, SSIM, perceptual, composite) can be registered later without
changing training code.

Example
-------
>>> from utils.losses import LossFactory
>>> criterion = LossFactory.build("l1")
>>> loss = criterion(prediction, target)
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, ClassVar, Dict, List, Type

import torch.nn as nn
from torch import Tensor

# Default loss used when no explicit loss name is provided.
DEFAULT_LOSS_NAME = "l1"


class RestorationLoss(nn.Module, ABC):
    """
    Abstract base class for image restoration losses.

    All concrete losses must accept ``(prediction, target)`` tensors with shape
    ``[B, C, H, W]`` and return a scalar loss for backpropagation.
    """

    @abstractmethod
    def forward(self, prediction: Tensor, target: Tensor) -> Tensor:
        """
        Compute the loss between model output and ground truth.

        Parameters
        ----------
        prediction:
            Restored image tensor produced by the model.
        target:
            Ground-truth image tensor.

        Returns
        -------
        torch.Tensor
            Scalar loss value.
        """
        raise NotImplementedError


class LossFactory:
    """
    Factory for constructing registered restoration loss functions.

    The training loop should depend only on this factory::

        criterion = LossFactory.build(config.loss_name, **config.loss_kwargs)
        loss = criterion(prediction, target)

    To add a new loss later:

    1. Subclass ``RestorationLoss``.
    2. Decorate it with ``@LossFactory.register("loss_name")``.
    3. Pass ``loss_name`` from configuration — no training-loop changes required.
    """

    _registry: ClassVar[Dict[str, Type[RestorationLoss]]] = {}

    @classmethod
    def register(cls, name: str):
        """
        Class decorator that registers a loss implementation under ``name``.

        Parameters
        ----------
        name:
            Case-insensitive identifier used by ``build()``.
        """

        def decorator(loss_cls: Type[RestorationLoss]) -> Type[RestorationLoss]:
            normalized_name = name.strip().lower()
            if not normalized_name:
                raise ValueError("Loss name cannot be empty.")

            if not issubclass(loss_cls, RestorationLoss):
                raise TypeError(
                    f"{loss_cls.__name__} must inherit from RestorationLoss."
                )

            if normalized_name in cls._registry:
                raise ValueError(
                    f"Loss '{normalized_name}' is already registered "
                    f"by {cls._registry[normalized_name].__name__}."
                )

            cls._registry[normalized_name] = loss_cls
            return loss_cls

        return decorator

    @classmethod
    def build(
        cls,
        name: str = DEFAULT_LOSS_NAME,
        **kwargs: Any,
    ) -> RestorationLoss:
        """
        Instantiate a registered loss by name.

        Parameters
        ----------
        name:
            Registered loss identifier. Defaults to ``"l1"``.
        **kwargs:
            Constructor arguments forwarded to the selected loss class.

        Returns
        -------
        RestorationLoss
            Initialized loss module ready for use in training.

        Raises
        ------
        ValueError
            If ``name`` is not registered.
        TypeError
            If constructor kwargs are invalid for the selected loss class.
        """
        normalized_name = name.strip().lower()
        loss_cls = cls._registry.get(normalized_name)

        if loss_cls is None:
            available = ", ".join(sorted(cls._registry)) or "(none)"
            raise ValueError(
                f"Unknown loss '{name}'. Available losses: {available}."
            )

        try:
            return loss_cls(**kwargs)
        except TypeError as exc:
            raise TypeError(
                f"Invalid arguments for loss '{normalized_name}' "
                f"({loss_cls.__name__}): {exc}"
            ) from exc

    @classmethod
    def available_losses(cls) -> List[str]:
        """Return sorted list of registered loss names."""
        return sorted(cls._registry)

    @classmethod
    def is_registered(cls, name: str) -> bool:
        """Return ``True`` if ``name`` corresponds to a registered loss."""
        return name.strip().lower() in cls._registry


@LossFactory.register("l1")
class L1RestorationLoss(RestorationLoss):
    """
    Mean Absolute Error (L1) loss for pixel-wise restoration.

    This is the default loss for SwinIR-style training and works well for
    grayscale semiconductor image denoising / artifact removal.
    """

    def __init__(self, reduction: str = "mean") -> None:
        """
        Parameters
        ----------
        reduction:
            Reduction applied to the output loss. One of ``"none"``,
            ``"mean"``, or ``"sum"``.
        """
        super().__init__()
        self.reduction = reduction
        self._criterion = nn.L1Loss(reduction=reduction)

    def forward(self, prediction: Tensor, target: Tensor) -> Tensor:
        _validate_prediction_target(prediction, target)
        return self._criterion(prediction, target)


def _validate_prediction_target(prediction: Tensor, target: Tensor) -> None:
    """
    Validate tensor shapes before loss computation.

    Raises
    ------
    ValueError
        If prediction and target shapes do not match.
    TypeError
        If inputs are not tensors.
    """
    if not isinstance(prediction, Tensor) or not isinstance(target, Tensor):
        raise TypeError("Both prediction and target must be torch.Tensor instances.")

    if prediction.shape != target.shape:
        raise ValueError(
            f"Shape mismatch: prediction {tuple(prediction.shape)} vs "
            f"target {tuple(target.shape)}."
        )
