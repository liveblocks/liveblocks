from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.anthropic_provider_options_anthropic import AnthropicProviderOptionsAnthropic


T = TypeVar("T", bound="AnthropicProviderOptions")


@_attrs_define
class AnthropicProviderOptions:
    """
    Attributes:
        anthropic (AnthropicProviderOptionsAnthropic):
    """

    anthropic: AnthropicProviderOptionsAnthropic

    def to_dict(self) -> dict[str, Any]:
        anthropic = self.anthropic.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "anthropic": anthropic,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.anthropic_provider_options_anthropic import AnthropicProviderOptionsAnthropic

        d = dict(src_dict)
        anthropic = AnthropicProviderOptionsAnthropic.from_dict(d.pop("anthropic"))

        anthropic_provider_options = cls(
            anthropic=anthropic,
        )

        return anthropic_provider_options
