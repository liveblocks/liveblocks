from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Self, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset


@_attrs_define
class OpenAiProviderOptionsOpenaiWebSearch:
    """
    Attributes:
        allowed_domains (list[str] | Unset):
    """

    allowed_domains: list[str] | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        allowed_domains: list[str] | Unset = UNSET
        if not isinstance(self.allowed_domains, Unset):
            allowed_domains = self.allowed_domains

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if allowed_domains is not UNSET:
            field_dict["allowedDomains"] = allowed_domains

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        allowed_domains = cast(list[str], d.pop("allowedDomains", UNSET))

        open_ai_provider_options_openai_web_search = cls(
            allowed_domains=allowed_domains,
        )

        return open_ai_provider_options_openai_web_search
