"""
Payment provider seam — manual reconciliation today; gateway plug-in later.

The platform does NOT process card payments. Donors redirect to EXTERNAL_STORE_URL;
admins record confirmed purchases via the internal Payment model.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Optional
from urllib.parse import urlencode

from django.conf import settings


@dataclass
class CheckoutRequest:
    sponsorship_id: int
    amount: Decimal
    reference: str = ""


@dataclass
class CheckoutResult:
    redirect_url: str
    provider: str


@dataclass
class CallbackVerification:
    valid: bool
    transaction_id: str = ""
    reference_number: str = ""
    amount: Optional[Decimal] = None
    raw: Optional[dict[str, Any]] = None


class PaymentProvider(ABC):
    @abstractmethod
    def create_checkout(self, request: CheckoutRequest) -> CheckoutResult:
        """Return a URL (or payload) for the donor to complete payment externally."""

    @abstractmethod
    def verify_callback(self, payload: dict[str, Any]) -> CallbackVerification:
        """Verify a gateway callback — unused for manual provider."""


class ManualPaymentProvider(PaymentProvider):
    """Redirect to project donation URL or configured external store."""

    def __init__(self, base_url: str = ""):
        self._base_url = base_url

    def create_checkout(self, request: CheckoutRequest) -> CheckoutResult:
        base = self._base_url or getattr(settings, "EXTERNAL_STORE_URL", "") or ""
        if not base:
            return CheckoutResult(redirect_url="", provider="manual")
        params = {
            "ref": request.reference or str(request.sponsorship_id),
            "sponsorship_id": str(request.sponsorship_id),
            "amount": str(request.amount),
        }
        sep = "&" if "?" in base else "?"
        url = f"{base}{sep}{urlencode({k: v for k, v in params.items() if v})}"
        return CheckoutResult(redirect_url=url, provider="manual")

    def verify_callback(self, payload: dict[str, Any]) -> CallbackVerification:
        return CallbackVerification(valid=False, raw=payload)


def get_payment_provider(sponsorship=None) -> PaymentProvider:
    base = ""
    if sponsorship and getattr(sponsorship, "project_id", None):
        project = sponsorship.project
        if project and project.donation_url:
            base = project.donation_url
    if not base:
        base = getattr(settings, "EXTERNAL_STORE_URL", "") or ""
    return ManualPaymentProvider(base_url=base)
