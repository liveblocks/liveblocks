from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.open_ai_provider_options_openai import OpenAiProviderOptionsOpenai


@_attrs_define
class OpenAiProviderOptions:
    """
    Example:
        {'openai': {'reasoningEffort': 'medium'}}

    Attributes:
        openai (OpenAiProviderOptionsOpenai):
    """

    openai: OpenAiProviderOptionsOpenai

    def to_dict(self) -> dict[str, Any]:
        openai = self.openai.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "openai": openai,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.open_ai_provider_options_openai import OpenAiProviderOptionsOpenai

        d = dict(src_dict)
        openai = OpenAiProviderOptionsOpenai.from_dict(d.pop("openai"))

        open_ai_provider_options = cls(
            openai=openai,
        )

        return open_ai_provider_options
