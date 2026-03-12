from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.google_provider_options_google import GoogleProviderOptionsGoogle


@_attrs_define
class GoogleProviderOptions:
    """
    Example:
        {'google': {'thinkingConfig': {'thinkingBudget': 10000}}}

    Attributes:
        google (GoogleProviderOptionsGoogle):
    """

    google: GoogleProviderOptionsGoogle

    def to_dict(self) -> dict[str, Any]:
        google = self.google.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "google": google,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.google_provider_options_google import GoogleProviderOptionsGoogle

        d = dict(src_dict)
        google = GoogleProviderOptionsGoogle.from_dict(d.pop("google"))

        google_provider_options = cls(
            google=google,
        )

        return google_provider_options
