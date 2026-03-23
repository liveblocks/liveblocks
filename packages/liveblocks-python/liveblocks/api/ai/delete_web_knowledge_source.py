from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    copilot_id: str,
    knowledge_source_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/v2/ai/copilots/{copilot_id}/knowledge/web/{knowledge_source_id}".format(
            copilot_id=quote(str(copilot_id), safe=""),
            knowledge_source_id=quote(str(knowledge_source_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.Client,
) -> None:
    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    copilot_id: str,
    knowledge_source_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    kwargs = _get_kwargs(
        copilot_id=copilot_id,
        knowledge_source_id=knowledge_source_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
