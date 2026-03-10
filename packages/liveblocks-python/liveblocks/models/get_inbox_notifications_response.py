from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Self, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.inbox_notification_custom_data import InboxNotificationCustomData
    from ..models.inbox_notification_thread_data import InboxNotificationThreadData


@_attrs_define
class GetInboxNotificationsResponse:
    """
    Attributes:
        next_cursor (None | str): A cursor to use for pagination. Pass this value as `startingAfter` to get the next
            page of results. `null` if there are no more results.
        data (list[InboxNotificationCustomData | InboxNotificationThreadData]):
    """

    next_cursor: None | str
    data: list[InboxNotificationCustomData | InboxNotificationThreadData]

    def to_dict(self) -> dict[str, Any]:
        from ..models.inbox_notification_thread_data import InboxNotificationThreadData

        next_cursor: None | str
        next_cursor = self.next_cursor

        data = []
        for data_item_data in self.data:
            data_item: dict[str, Any]
            if isinstance(data_item_data, InboxNotificationThreadData):
                data_item = data_item_data.to_dict()
            else:
                data_item = data_item_data.to_dict()

            data.append(data_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "nextCursor": next_cursor,
                "data": data,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.inbox_notification_custom_data import InboxNotificationCustomData
        from ..models.inbox_notification_thread_data import InboxNotificationThreadData

        d = dict(src_dict)

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        data = []
        _data = d.pop("data")
        for data_item_data in _data:

            def _parse_data_item(data: object) -> InboxNotificationCustomData | InboxNotificationThreadData:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    data_item_type_0 = InboxNotificationThreadData.from_dict(data)

                    return data_item_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                data_item_type_1 = InboxNotificationCustomData.from_dict(data)

                return data_item_type_1

            data_item = _parse_data_item(data_item_data)

            data.append(data_item)

        get_inbox_notifications_response = cls(
            next_cursor=next_cursor,
            data=data,
        )

        return get_inbox_notifications_response
