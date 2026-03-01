from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_ai_copilot_provider_options_type_0_openai import CreateAiCopilotProviderOptionsType0Openai


T = TypeVar("T", bound="CreateAiCopilotProviderOptionsType0")


@_attrs_define
class CreateAiCopilotProviderOptionsType0:
    """
    Attributes:
        openai (CreateAiCopilotProviderOptionsType0Openai | Unset):
    """

    openai: CreateAiCopilotProviderOptionsType0Openai | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        openai: dict[str, Any] | Unset = UNSET
        if not isinstance(self.openai, Unset):
            openai = self.openai.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if openai is not UNSET:
            field_dict["openai"] = openai

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_ai_copilot_provider_options_type_0_openai import CreateAiCopilotProviderOptionsType0Openai

        d = dict(src_dict)
        _openai = d.pop("openai", UNSET)
        openai: CreateAiCopilotProviderOptionsType0Openai | Unset
        if isinstance(_openai, Unset):
            openai = UNSET
        else:
            openai = CreateAiCopilotProviderOptionsType0Openai.from_dict(_openai)

        create_ai_copilot_provider_options_type_0 = cls(
            openai=openai,
        )

        create_ai_copilot_provider_options_type_0.additional_properties = d
        return create_ai_copilot_provider_options_type_0

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
