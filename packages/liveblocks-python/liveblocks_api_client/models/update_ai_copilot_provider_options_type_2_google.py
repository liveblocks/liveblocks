from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_ai_copilot_provider_options_type_2_google_thinking_config import (
        UpdateAiCopilotProviderOptionsType2GoogleThinkingConfig,
    )


T = TypeVar("T", bound="UpdateAiCopilotProviderOptionsType2Google")


@_attrs_define
class UpdateAiCopilotProviderOptionsType2Google:
    """
    Attributes:
        thinking_config (UpdateAiCopilotProviderOptionsType2GoogleThinkingConfig | Unset):
    """

    thinking_config: UpdateAiCopilotProviderOptionsType2GoogleThinkingConfig | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        thinking_config: dict[str, Any] | Unset = UNSET
        if not isinstance(self.thinking_config, Unset):
            thinking_config = self.thinking_config.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if thinking_config is not UNSET:
            field_dict["thinkingConfig"] = thinking_config

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.update_ai_copilot_provider_options_type_2_google_thinking_config import (
            UpdateAiCopilotProviderOptionsType2GoogleThinkingConfig,
        )

        d = dict(src_dict)
        _thinking_config = d.pop("thinkingConfig", UNSET)
        thinking_config: UpdateAiCopilotProviderOptionsType2GoogleThinkingConfig | Unset
        if isinstance(_thinking_config, Unset):
            thinking_config = UNSET
        else:
            thinking_config = UpdateAiCopilotProviderOptionsType2GoogleThinkingConfig.from_dict(_thinking_config)

        update_ai_copilot_provider_options_type_2_google = cls(
            thinking_config=thinking_config,
        )

        update_ai_copilot_provider_options_type_2_google.additional_properties = d
        return update_ai_copilot_provider_options_type_2_google

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
