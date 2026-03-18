from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.google_provider_options_google_thinking_config import GoogleProviderOptionsGoogleThinkingConfig


@_attrs_define
class GoogleProviderOptionsGoogle:
    """
    Attributes:
        thinking_config (GoogleProviderOptionsGoogleThinkingConfig | Unset):
    """

    thinking_config: GoogleProviderOptionsGoogleThinkingConfig | Unset = UNSET
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
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.google_provider_options_google_thinking_config import GoogleProviderOptionsGoogleThinkingConfig

        d = dict(src_dict)
        _thinking_config = d.pop("thinkingConfig", UNSET)
        thinking_config: GoogleProviderOptionsGoogleThinkingConfig | Unset
        if isinstance(_thinking_config, Unset):
            thinking_config = UNSET
        else:
            thinking_config = GoogleProviderOptionsGoogleThinkingConfig.from_dict(_thinking_config)

        google_provider_options_google = cls(
            thinking_config=thinking_config,
        )

        google_provider_options_google.additional_properties = d
        return google_provider_options_google

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
