from __future__ import annotations

import httpx
import pytest

from liveblocks.errors import LiveblocksError
from liveblocks.models.create_room_request_body import CreateRoomRequestBody
from liveblocks.models.room_permission_item import RoomPermissionItem

ROOM_JSON = {
    "id": "my-room",
    "type": "room",
    "createdAt": "2024-01-15T10:30:00Z",
    "defaultAccesses": ["room:write"],
    "usersAccesses": {},
    "groupsAccesses": {},
    "metadata": {},
    "organizationId": "org_123456789",
}


# ---------------------------------------------------------------------------
# GET /rooms
# ---------------------------------------------------------------------------


class TestGetRooms:
    def test_sync_returns_parsed_response(self, sync_client, mock_api):
        route = mock_api.get("/rooms").mock(
            return_value=httpx.Response(200, json={"nextCursor": None, "data": [ROOM_JSON]})
        )
        result = sync_client.get_rooms()

        assert route.called
        assert len(result.data) == 1
        assert result.data[0].id == "my-room"
        assert result.next_cursor is None

    @pytest.mark.anyio
    async def test_async_returns_parsed_response(self, async_client, mock_api):
        mock_api.get("/rooms").mock(
            return_value=httpx.Response(200, json={"nextCursor": "cursor_abc", "data": [ROOM_JSON]})
        )
        result = await async_client.get_rooms()

        assert len(result.data) == 1
        assert result.data[0].id == "my-room"
        assert result.next_cursor == "cursor_abc"

    def test_passes_query_params(self, sync_client, mock_api):
        route = mock_api.get("/rooms").mock(return_value=httpx.Response(200, json={"nextCursor": None, "data": []}))
        sync_client.get_rooms(limit=5, user_id="user-1")

        request = route.calls.last.request
        assert request.url.params["limit"] == "5"
        assert request.url.params["userId"] == "user-1"

    def test_empty_room_list(self, sync_client, mock_api):
        mock_api.get("/rooms").mock(return_value=httpx.Response(200, json={"nextCursor": None, "data": []}))
        result = sync_client.get_rooms()

        assert result.data == []


# ---------------------------------------------------------------------------
# GET /rooms/{room_id}
# ---------------------------------------------------------------------------


class TestGetRoom:
    def test_sync_returns_room(self, sync_client, mock_api):
        mock_api.get("/rooms/my-room").mock(return_value=httpx.Response(200, json=ROOM_JSON))
        room = sync_client.get_room("my-room")

        assert room.id == "my-room"
        assert room.type_.value == "room"

    @pytest.mark.anyio
    async def test_async_returns_room(self, async_client, mock_api):
        mock_api.get("/rooms/my-room").mock(return_value=httpx.Response(200, json=ROOM_JSON))
        room = await async_client.get_room("my-room")

        assert room.id == "my-room"

    def test_url_encodes_room_id(self, sync_client, mock_api):
        mock_api.get("/rooms/room%2Fwith%2Fslashes").mock(
            return_value=httpx.Response(200, json={**ROOM_JSON, "id": "room/with/slashes"})
        )
        room = sync_client.get_room("room/with/slashes")

        assert room.id == "room/with/slashes"


# ---------------------------------------------------------------------------
# POST /rooms
# ---------------------------------------------------------------------------


class TestCreateRoom:
    def test_sync_sends_body_and_returns_room(self, sync_client, mock_api):
        route = mock_api.post("/rooms").mock(return_value=httpx.Response(200, json=ROOM_JSON))
        body = CreateRoomRequestBody.from_dict(
            {
                "id": "my-room",
                "defaultAccesses": ["room:write"],
            }
        )
        room = sync_client.create_room(body=body)

        assert room.id == "my-room"
        request = route.calls.last.request
        assert request.headers["content-type"] == "application/json"

    @pytest.mark.anyio
    async def test_async_sends_body_and_returns_room(self, async_client, mock_api):
        mock_api.post("/rooms").mock(return_value=httpx.Response(200, json=ROOM_JSON))
        body = CreateRoomRequestBody.from_dict(
            {
                "id": "my-room",
                "defaultAccesses": ["room:write"],
            }
        )
        room = await async_client.create_room(body=body)

        assert room.id == "my-room"

    def test_request_body_serialization(self, sync_client, mock_api):
        route = mock_api.post("/rooms").mock(return_value=httpx.Response(200, json=ROOM_JSON))
        body = CreateRoomRequestBody(
            id="new-room",
            default_accesses=[RoomPermissionItem.ROOMWRITE],
        )
        sync_client.create_room(body=body)

        import json

        sent = json.loads(route.calls.last.request.content)
        assert sent["id"] == "new-room"
        assert sent["defaultAccesses"] == ["room:write"]


# ---------------------------------------------------------------------------
# DELETE /rooms/{room_id}
# ---------------------------------------------------------------------------


class TestDeleteRoom:
    def test_sync_returns_none(self, sync_client, mock_api):
        mock_api.delete("/rooms/my-room").mock(return_value=httpx.Response(204))
        result = sync_client.delete_room("my-room")

        assert result is None

    @pytest.mark.anyio
    async def test_async_returns_none(self, async_client, mock_api):
        mock_api.delete("/rooms/my-room").mock(return_value=httpx.Response(204))
        result = await async_client.delete_room("my-room")

        assert result is None


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestErrorHandling:
    def test_403_raises_liveblocks_error(self, sync_client, mock_api):
        mock_api.get("/rooms").mock(return_value=httpx.Response(403, json={"message": "Forbidden"}))
        with pytest.raises(LiveblocksError) as exc_info:
            sync_client.get_rooms()

        assert exc_info.value.status == 403
        assert "Forbidden" in str(exc_info.value)

    def test_404_raises_liveblocks_error(self, sync_client, mock_api):
        mock_api.get("/rooms/nonexistent").mock(return_value=httpx.Response(404, json={"message": "Room not found"}))
        with pytest.raises(LiveblocksError) as exc_info:
            sync_client.get_room("nonexistent")

        assert exc_info.value.status == 404

    def test_error_with_suggestion_and_docs(self, sync_client, mock_api):
        mock_api.get("/rooms").mock(
            return_value=httpx.Response(
                401,
                json={
                    "message": "Unauthorized",
                    "suggestion": "Check your API key",
                    "docs": "https://liveblocks.io/docs",
                },
            )
        )
        with pytest.raises(LiveblocksError) as exc_info:
            sync_client.get_rooms()

        assert exc_info.value.status == 401
        assert exc_info.value.details is not None
        assert "Check your API key" in exc_info.value.details
        assert "https://liveblocks.io/docs" in exc_info.value.details

    @pytest.mark.anyio
    async def test_async_error_handling(self, async_client, mock_api):
        mock_api.get("/rooms").mock(return_value=httpx.Response(500, json={"message": "Internal Server Error"}))
        with pytest.raises(LiveblocksError) as exc_info:
            await async_client.get_rooms()

        assert exc_info.value.status == 500
