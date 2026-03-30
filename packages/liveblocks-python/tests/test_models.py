from __future__ import annotations

from liveblocks.models.create_room_request_body import CreateRoomRequestBody
from liveblocks.models.get_rooms_response import GetRoomsResponse
from liveblocks.models.room import Room

ROOM_DICT = {
    "id": "my-room",
    "type": "room",
    "createdAt": "2024-01-15T10:30:00+00:00",
    "defaultAccesses": ["room:write"],
    "usersAccesses": {},
    "groupsAccesses": {},
    "metadata": {},
    "organizationId": "org_123456789",
}

ROOM_DICT_FULL = {
    "id": "full-room",
    "type": "room",
    "createdAt": "2024-06-01T12:00:00+00:00",
    "lastConnectionAt": "2024-06-02T08:15:00+00:00",
    "defaultAccesses": ["room:read", "room:presence:write"],
    "usersAccesses": {"user-1": ["room:write"]},
    "groupsAccesses": {"team-a": ["room:write"]},
    "metadata": {"color": "blue", "tags": ["draft", "v2"]},
    "organizationId": "org_123456789",
}


class TestRoomModel:
    def test_from_dict_basic(self):
        room = Room.from_dict(ROOM_DICT)

        assert room.id == "my-room"
        assert room.type_.value == "room"
        assert len(room.default_accesses) == 1
        assert room.default_accesses[0].value == "room:write"

    def test_round_trip_basic(self):
        room = Room.from_dict(ROOM_DICT)
        result = room.to_dict()

        assert result == ROOM_DICT

    def test_round_trip_full(self):
        room = Room.from_dict(ROOM_DICT_FULL)
        result = room.to_dict()

        assert result == ROOM_DICT_FULL

    def test_metadata_access(self):
        room = Room.from_dict(ROOM_DICT_FULL)

        assert room.metadata["color"] == "blue"
        assert room.metadata["tags"] == ["draft", "v2"]

    def test_users_accesses(self):
        room = Room.from_dict(ROOM_DICT_FULL)

        assert "user-1" in room.users_accesses


class TestGetRoomsResponseModel:
    def test_from_dict_with_rooms(self):
        data = {"nextCursor": "cursor_abc", "data": [ROOM_DICT]}
        response = GetRoomsResponse.from_dict(data)

        assert response.next_cursor == "cursor_abc"
        assert len(response.data) == 1
        assert response.data[0].id == "my-room"

    def test_from_dict_empty(self):
        data = {"nextCursor": None, "data": []}
        response = GetRoomsResponse.from_dict(data)

        assert response.next_cursor is None
        assert response.data == []

    def test_round_trip(self):
        data = {"nextCursor": None, "data": [ROOM_DICT]}
        response = GetRoomsResponse.from_dict(data)
        result = response.to_dict()

        assert result == data


class TestCreateRoomRequestBodyModel:
    def test_from_dict_minimal(self):
        body = CreateRoomRequestBody.from_dict(
            {
                "id": "new-room",
                "defaultAccesses": ["room:write"],
            }
        )

        assert body.id == "new-room"
        assert len(body.default_accesses) == 1

    def test_round_trip_minimal(self):
        original = {"id": "new-room", "defaultAccesses": ["room:write"]}
        body = CreateRoomRequestBody.from_dict(original)
        result = body.to_dict()

        assert result == original

    def test_round_trip_with_metadata(self):
        original = {
            "id": "new-room",
            "defaultAccesses": ["room:write"],
            "metadata": {"env": "staging"},
        }
        body = CreateRoomRequestBody.from_dict(original)
        result = body.to_dict()

        assert result == original
