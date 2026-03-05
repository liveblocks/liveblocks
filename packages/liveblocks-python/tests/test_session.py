import pytest

from liveblocks.client import Liveblocks

P1 = "room:read"
P2 = "room:write"
P3 = "comments:read"


def make_session(
    secret: str = "sk_testingtesting",
    user_info: dict | None = None,
    organization_id: str | None = None,
):
    client = Liveblocks(secret=secret)
    return client.prepare_session("user-123", user_info=user_info, organization_id=organization_id)


class TestConstructorValidation:
    def test_rejects_empty_user_id(self):
        client = Liveblocks(secret="sk_testingtesting")
        with pytest.raises(ValueError, match="Invalid value for 'user_id'"):
            client.prepare_session("")


class TestPermissions:
    def test_default_session_has_no_permissions(self):
        assert make_session()._has_permissions is False

    def test_adding_permissions_makes_has_permissions_true(self):
        session = make_session()
        assert session.allow("xyz", session.FULL_ACCESS)._has_permissions is True

    def test_full_access_permissions(self):
        session = make_session()
        assert session.allow("xyz", session.FULL_ACCESS)._serialize_permissions() == {
            "xyz": ["room:write", "comments:write"],
        }

    def test_read_access_permissions(self):
        session = make_session()
        assert session.allow("xyz", session.READ_ACCESS)._serialize_permissions() == {
            "xyz": ["room:read", "room:presence:write", "comments:read"],
        }

    def test_raises_on_empty_room_name(self):
        session = make_session()
        with pytest.raises(ValueError, match="Invalid room name or pattern"):
            session.allow("", session.READ_ACCESS)

    def test_raises_on_room_name_too_long(self):
        with pytest.raises(ValueError, match="Invalid room name or pattern"):
            make_session().allow("a" * 129, [P1])

    def test_raises_on_empty_permission_list(self):
        with pytest.raises(ValueError, match="Permission list cannot be empty"):
            make_session().allow("foobar", [])

    def test_raises_on_asterisk_in_middle_of_room_name(self):
        with pytest.raises(ValueError, match="Invalid room name or pattern"):
            make_session().allow("foo*bar", [P1])

    def test_allows_prefix_patterns(self):
        assert make_session().allow("foobar*", [P1])._serialize_permissions() == {
            "foobar*": [P1],
        }

    def test_allows_asterisk_as_pattern(self):
        assert make_session().allow("*", [P1])._serialize_permissions() == {
            "*": [P1],
        }

    def test_raises_on_invalid_permissions(self):
        with pytest.raises(ValueError, match="Not a valid permission: x"):
            make_session().allow("foobar*", ["x", "y"])

    def test_permissions_are_additive(self):
        assert (make_session().allow("foo", [P1]).allow("bar", [P2]).allow("foo", [P3])._serialize_permissions()) == {
            "foo": [P1, P3],
            "bar": [P2],
        }

    def test_permissions_are_deduped(self):
        assert (
            make_session()
            .allow("r", [P1])
            .allow("r", [P2, P3])
            .allow("r", [P1, P3])
            .allow("r", [P3])
            .allow("r", [P3])
            .allow("r", [P3])
            .allow("r", [P3])
            ._serialize_permissions()
        ) == {
            "r": [P1, P2, P3],
        }

    def test_raises_on_more_than_10_room_entries(self):
        session = make_session()
        for i in range(10):
            session.allow(f"room{i}", [P1])

        assert len(session._serialize_permissions()) == 10

        with pytest.raises(RuntimeError, match="more than 10 rooms"):
            session.allow("one-more-room", [P1])

        # Adding to an existing entry is fine
        session.allow("room7", [P2])


class TestSealing:
    def test_build_request_body_prevents_reuse(self):
        session = make_session().allow("r", [P1]).allow("r", [P2, P3])

        session._build_request_body()

        with pytest.raises(RuntimeError, match="You cannot reuse Session instances"):
            session._build_request_body()

    def test_build_request_body_prevents_further_allow(self):
        session = make_session().allow("r", [P1])

        session._build_request_body()

        with pytest.raises(RuntimeError, match="You can no longer change these permissions"):
            session.allow("r", [P1])


class TestSessionOptions:
    def test_organization_id_can_be_set(self):
        session = make_session(organization_id="org-123")
        assert session.allow("room-1", [P1])._has_permissions is True

    def test_user_info_can_be_set(self):
        session = make_session(user_info={"name": "Ada"})
        assert session.allow("room-1", [P1])._has_permissions is True

    def test_organization_id_is_optional(self):
        session = make_session()
        assert session.allow("room-1", [P1])._has_permissions is True
