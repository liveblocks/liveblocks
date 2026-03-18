from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.user_subscription import UserSubscription


@_attrs_define
class GetThreadSubscriptionsResponse:
    """
    Example:
        {'data': [{'kind': 'thread', 'subjectId': 'th_abc123', 'createdAt': '2022-07-13T14:32:50.697Z', 'userId':
            'alice'}]}

    Attributes:
        data (list[UserSubscription]):
    """

    data: list[UserSubscription]

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.user_subscription import UserSubscription

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = UserSubscription.from_dict(data_item_data)

            data.append(data_item)

        get_thread_subscriptions_response = cls(
            data=data,
        )

        return get_thread_subscriptions_response
