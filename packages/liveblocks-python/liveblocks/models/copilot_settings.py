from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="CopilotSettings")


@_attrs_define
class CopilotSettings:
    """
    Attributes:
        max_tokens (float | Unset):
        temperature (float | Unset):
        top_p (float | Unset):
        top_k (float | Unset):
        frequency_penalty (float | Unset):
        presence_penalty (float | Unset):
        stop_sequences (list[str] | Unset):
        seed (float | Unset):
        max_retries (float | Unset):
    """

    max_tokens: float | Unset = UNSET
    temperature: float | Unset = UNSET
    top_p: float | Unset = UNSET
    top_k: float | Unset = UNSET
    frequency_penalty: float | Unset = UNSET
    presence_penalty: float | Unset = UNSET
    stop_sequences: list[str] | Unset = UNSET
    seed: float | Unset = UNSET
    max_retries: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        max_tokens = self.max_tokens

        temperature = self.temperature

        top_p = self.top_p

        top_k = self.top_k

        frequency_penalty = self.frequency_penalty

        presence_penalty = self.presence_penalty

        stop_sequences: list[str] | Unset = UNSET
        if not isinstance(self.stop_sequences, Unset):
            stop_sequences = self.stop_sequences

        seed = self.seed

        max_retries = self.max_retries

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if max_tokens is not UNSET:
            field_dict["maxTokens"] = max_tokens
        if temperature is not UNSET:
            field_dict["temperature"] = temperature
        if top_p is not UNSET:
            field_dict["topP"] = top_p
        if top_k is not UNSET:
            field_dict["topK"] = top_k
        if frequency_penalty is not UNSET:
            field_dict["frequencyPenalty"] = frequency_penalty
        if presence_penalty is not UNSET:
            field_dict["presencePenalty"] = presence_penalty
        if stop_sequences is not UNSET:
            field_dict["stopSequences"] = stop_sequences
        if seed is not UNSET:
            field_dict["seed"] = seed
        if max_retries is not UNSET:
            field_dict["maxRetries"] = max_retries

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        max_tokens = d.pop("maxTokens", UNSET)

        temperature = d.pop("temperature", UNSET)

        top_p = d.pop("topP", UNSET)

        top_k = d.pop("topK", UNSET)

        frequency_penalty = d.pop("frequencyPenalty", UNSET)

        presence_penalty = d.pop("presencePenalty", UNSET)

        stop_sequences = cast(list[str], d.pop("stopSequences", UNSET))

        seed = d.pop("seed", UNSET)

        max_retries = d.pop("maxRetries", UNSET)

        copilot_settings = cls(
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            frequency_penalty=frequency_penalty,
            presence_penalty=presence_penalty,
            stop_sequences=stop_sequences,
            seed=seed,
            max_retries=max_retries,
        )

        copilot_settings.additional_properties = d
        return copilot_settings

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
