from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_ai_copilot_provider_options_type_1_anthropic import (
        CreateAiCopilotProviderOptionsType1Anthropic,
    )


T = TypeVar("T", bound="CreateAiCopilotProviderOptionsType1")


@_attrs_define
class CreateAiCopilotProviderOptionsType1:
    """
    Attributes:
        anthropic (CreateAiCopilotProviderOptionsType1Anthropic | Unset):
    """

    anthropic: CreateAiCopilotProviderOptionsType1Anthropic | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        anthropic: dict[str, Any] | Unset = UNSET
        if not isinstance(self.anthropic, Unset):
            anthropic = self.anthropic.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if anthropic is not UNSET:
            field_dict["anthropic"] = anthropic

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_ai_copilot_provider_options_type_1_anthropic import (
            CreateAiCopilotProviderOptionsType1Anthropic,
        )

        d = dict(src_dict)
        _anthropic = d.pop("anthropic", UNSET)
        anthropic: CreateAiCopilotProviderOptionsType1Anthropic | Unset
        if isinstance(_anthropic, Unset):
            anthropic = UNSET
        else:
            anthropic = CreateAiCopilotProviderOptionsType1Anthropic.from_dict(_anthropic)

        create_ai_copilot_provider_options_type_1 = cls(
            anthropic=anthropic,
        )

        create_ai_copilot_provider_options_type_1.additional_properties = d
        return create_ai_copilot_provider_options_type_1

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
