from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.ai_copilot_type_0 import AiCopilotType0
from ...models.ai_copilot_type_1 import AiCopilotType1
from ...models.ai_copilot_type_2 import AiCopilotType2
from ...models.ai_copilot_type_3 import AiCopilotType3
from ...models.error import Error
from ...models.update_ai_copilot import UpdateAiCopilot
from ...types import UNSET, Response, Unset


def _get_kwargs(
    copilot_id: str,
    *,
    body: UpdateAiCopilot | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/ai/copilots/{copilot_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error | None:
    if response.status_code == 200:

        def _parse_response_200(data: object) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_ai_copilot_type_0 = AiCopilotType0.from_dict(data)

                return componentsschemas_ai_copilot_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_ai_copilot_type_1 = AiCopilotType1.from_dict(data)

                return componentsschemas_ai_copilot_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_ai_copilot_type_2 = AiCopilotType2.from_dict(data)

                return componentsschemas_ai_copilot_type_2
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            componentsschemas_ai_copilot_type_3 = AiCopilotType3.from_dict(data)

            return componentsschemas_ai_copilot_type_3

        response_200 = _parse_response_200(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 422:
        response_422 = Error.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateAiCopilot | Unset = UNSET,
) -> Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]:
    r"""Update AI copilot

     This endpoint updates an existing AI copilot's configuration. Corresponds to
    [`liveblocks.updateAiCopilot`](/docs/api-reference/liveblocks-node#update-ai-copilot).

    This endpoint returns a 422 response if the update doesn't apply due to validation failures. For
    example, if the existing copilot uses the \"openai\" provider and you attempt to update the provider
    model to an incompatible value for the provider, like \"gemini-2.5-pro\", you'll receive a 422
    response with an error message explaining where the validation failed.

    Args:
        copilot_id (str):
        body (UpdateAiCopilot | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateAiCopilot | Unset = UNSET,
) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error | None:
    r"""Update AI copilot

     This endpoint updates an existing AI copilot's configuration. Corresponds to
    [`liveblocks.updateAiCopilot`](/docs/api-reference/liveblocks-node#update-ai-copilot).

    This endpoint returns a 422 response if the update doesn't apply due to validation failures. For
    example, if the existing copilot uses the \"openai\" provider and you attempt to update the provider
    model to an incompatible value for the provider, like \"gemini-2.5-pro\", you'll receive a 422
    response with an error message explaining where the validation failed.

    Args:
        copilot_id (str):
        body (UpdateAiCopilot | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error
    """

    return sync_detailed(
        copilot_id=copilot_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateAiCopilot | Unset = UNSET,
) -> Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]:
    r"""Update AI copilot

     This endpoint updates an existing AI copilot's configuration. Corresponds to
    [`liveblocks.updateAiCopilot`](/docs/api-reference/liveblocks-node#update-ai-copilot).

    This endpoint returns a 422 response if the update doesn't apply due to validation failures. For
    example, if the existing copilot uses the \"openai\" provider and you attempt to update the provider
    model to an incompatible value for the provider, like \"gemini-2.5-pro\", you'll receive a 422
    response with an error message explaining where the validation failed.

    Args:
        copilot_id (str):
        body (UpdateAiCopilot | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error]
    """

    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    copilot_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateAiCopilot | Unset = UNSET,
) -> AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error | None:
    r"""Update AI copilot

     This endpoint updates an existing AI copilot's configuration. Corresponds to
    [`liveblocks.updateAiCopilot`](/docs/api-reference/liveblocks-node#update-ai-copilot).

    This endpoint returns a 422 response if the update doesn't apply due to validation failures. For
    example, if the existing copilot uses the \"openai\" provider and you attempt to update the provider
    model to an incompatible value for the provider, like \"gemini-2.5-pro\", you'll receive a 422
    response with an error message explaining where the validation failed.

    Args:
        copilot_id (str):
        body (UpdateAiCopilot | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AiCopilotType0 | AiCopilotType1 | AiCopilotType2 | AiCopilotType3 | Error
    """

    return (
        await asyncio_detailed(
            copilot_id=copilot_id,
            client=client,
            body=body,
        )
    ).parsed
