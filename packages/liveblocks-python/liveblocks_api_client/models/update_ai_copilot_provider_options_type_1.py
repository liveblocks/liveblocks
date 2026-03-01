from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_ai_copilot_provider_options_type_1_anthropic import (
        UpdateAiCopilotProviderOptionsType1Anthropic,
    )


T = TypeVar("T", bound="UpdateAiCopilotProviderOptionsType1")


@_attrs_define
class UpdateAiCopilotProviderOptionsType1:
    """
    Attributes:
        anthropic (UpdateAiCopilotProviderOptionsType1Anthropic | Unset):
    """

    anthropic: UpdateAiCopilotProviderOptionsType1Anthropic | Unset = UNSET
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
        from ..models.update_ai_copilot_provider_options_type_1_anthropic import (
            UpdateAiCopilotProviderOptionsType1Anthropic,
        )

        d = dict(src_dict)
        _anthropic = d.pop("anthropic", UNSET)
        anthropic: UpdateAiCopilotProviderOptionsType1Anthropic | Unset
        if isinstance(_anthropic, Unset):
            anthropic = UNSET
        else:
            anthropic = UpdateAiCopilotProviderOptionsType1Anthropic.from_dict(_anthropic)

        update_ai_copilot_provider_options_type_1 = cls(
            anthropic=anthropic,
        )

        update_ai_copilot_provider_options_type_1.additional_properties = d
        return update_ai_copilot_provider_options_type_1

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
