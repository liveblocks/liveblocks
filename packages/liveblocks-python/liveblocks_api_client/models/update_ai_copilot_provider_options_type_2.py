from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_ai_copilot_provider_options_type_2_google import UpdateAiCopilotProviderOptionsType2Google


T = TypeVar("T", bound="UpdateAiCopilotProviderOptionsType2")


@_attrs_define
class UpdateAiCopilotProviderOptionsType2:
    """
    Attributes:
        google (UpdateAiCopilotProviderOptionsType2Google | Unset):
    """

    google: UpdateAiCopilotProviderOptionsType2Google | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        google: dict[str, Any] | Unset = UNSET
        if not isinstance(self.google, Unset):
            google = self.google.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if google is not UNSET:
            field_dict["google"] = google

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.update_ai_copilot_provider_options_type_2_google import UpdateAiCopilotProviderOptionsType2Google

        d = dict(src_dict)
        _google = d.pop("google", UNSET)
        google: UpdateAiCopilotProviderOptionsType2Google | Unset
        if isinstance(_google, Unset):
            google = UNSET
        else:
            google = UpdateAiCopilotProviderOptionsType2Google.from_dict(_google)

        update_ai_copilot_provider_options_type_2 = cls(
            google=google,
        )

        update_ai_copilot_provider_options_type_2.additional_properties = d
        return update_ai_copilot_provider_options_type_2

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
