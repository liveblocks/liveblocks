from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.notification_settings import NotificationSettings
from ...models.update_notification_settings_request_body import UpdateNotificationSettingsRequestBody


def _get_kwargs(
    user_id: str,
    *,
    body: UpdateNotificationSettingsRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/users/{user_id}/notification-settings".format(
            user_id=quote(str(user_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> NotificationSettings:
    if response.status_code == 200:
        response_200 = NotificationSettings.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    user_id: str,
    *,
    client: httpx.Client,
    body: UpdateNotificationSettingsRequestBody,
) -> NotificationSettings:
    kwargs = _get_kwargs(
        user_id=user_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    user_id: str,
    *,
    client: httpx.AsyncClient,
    body: UpdateNotificationSettingsRequestBody,
) -> NotificationSettings:
    kwargs = _get_kwargs(
        user_id=user_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
