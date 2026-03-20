from __future__ import annotations

import re
import warnings
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from liveblocks.client import AsyncLiveblocks, Liveblocks
    from liveblocks.models.authorize_user_request_body import AuthorizeUserRequestBody
    from liveblocks.models.authorize_user_response import AuthorizeUserResponse

Permission = Literal[
    "room:write",
    "room:read",
    "room:presence:write",
    "comments:write",
    "comments:read",
]

ALL_PERMISSIONS: frozenset[str] = frozenset(
    ["room:write", "room:read", "room:presence:write", "comments:write", "comments:read"]
)

READ_ACCESS: tuple[Permission, ...] = ("room:read", "room:presence:write", "comments:read")
FULL_ACCESS: tuple[Permission, ...] = ("room:write", "comments:write")

_MAX_PERMS_PER_SET = 10
_ROOM_PATTERN_RE = re.compile(r"^([*]|[^*]{1,128}[*]?)$")


class _BaseSession:
    """Shared permission-building logic for sync and async sessions."""

    FULL_ACCESS = FULL_ACCESS
    READ_ACCESS = READ_ACCESS

    def __init__(
        self,
        user_id: str,
        user_info: dict[str, Any] | None = None,
        organization_id: str | None = None,
    ) -> None:
        if not user_id:
            raise ValueError(
                "Invalid value for 'user_id'. Please provide a non-empty string. "
                "For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
            )

        self._user_id = user_id
        self._user_info = user_info
        self._organization_id = organization_id
        self._sealed = False
        self._permissions: dict[str, list[str]] = {}

    def _get_or_create(self, room_id: str) -> list[str]:
        if self._sealed:
            raise RuntimeError("You can no longer change these permissions.")

        perms = self._permissions.get(room_id)
        if perms is not None:
            return perms

        if len(self._permissions) >= _MAX_PERMS_PER_SET:
            raise RuntimeError("You cannot add permissions for more than 10 rooms in a single token")

        perms = []
        self._permissions[room_id] = perms
        return perms

    def allow(self, room_id_or_pattern: str, permissions: Sequence[Permission]) -> _BaseSession:
        if not _ROOM_PATTERN_RE.match(room_id_or_pattern):
            raise ValueError("Invalid room name or pattern")
        if not permissions:
            raise ValueError("Permission list cannot be empty")

        existing = self._get_or_create(room_id_or_pattern)
        for perm in permissions:
            if perm not in ALL_PERMISSIONS:
                raise ValueError(f"Not a valid permission: {perm}")
            if perm not in existing:
                existing.append(perm)
        return self

    @property
    def _has_permissions(self) -> bool:
        return bool(self._permissions)

    def _serialize_permissions(self) -> dict[str, list[str]]:
        return {pat: list(perms) for pat, perms in self._permissions.items()}

    def _build_request_body(self) -> AuthorizeUserRequestBody:
        from liveblocks.models.authorize_user_request_body import AuthorizeUserRequestBody
        from liveblocks.models.authorize_user_request_body_permissions import (
            AuthorizeUserRequestBodyPermissions,
        )
        from liveblocks.models.authorize_user_request_body_user_info import (
            AuthorizeUserRequestBodyUserInfo,
        )

        if self._sealed:
            raise RuntimeError("You cannot reuse Session instances. Please create a new session every time.")
        self._sealed = True
        if not self._permissions:
            warnings.warn(
                "Access tokens without any permission will not be supported soon, "
                "you should use wildcards when the client requests a token for "
                "resources outside a room. See https://liveblocks.io/docs/errors/"
                "liveblocks-client/access-tokens-not-enough-permissions",
                stacklevel=3,
            )

        perms_model = AuthorizeUserRequestBodyPermissions()
        perms_model.additional_properties = self._serialize_permissions()

        user_info_model: AuthorizeUserRequestBodyUserInfo | None = None
        if self._user_info is not None:
            user_info_model = AuthorizeUserRequestBodyUserInfo()
            user_info_model.additional_properties = dict(self._user_info)

        body = AuthorizeUserRequestBody(
            user_id=self._user_id,
            permissions=perms_model,
        )

        if user_info_model is not None:
            body.user_info = user_info_model
        if self._organization_id is not None:
            body.organization_id = self._organization_id

        return body


class Session(_BaseSession):
    """Synchronous session. Created by ``Liveblocks.prepare_session()``.

    Usage::

        session = client.prepare_session("user-123")
        session.allow("my-room", session.FULL_ACCESS)
        result = session.authorize()
    """

    def __init__(
        self,
        client: Liveblocks,
        user_id: str,
        user_info: dict[str, Any] | None = None,
        organization_id: str | None = None,
    ) -> None:
        super().__init__(user_id, user_info=user_info, organization_id=organization_id)
        self._client = client

    def allow(self, room_id_or_pattern: str, permissions: Sequence[Permission]) -> Session:
        super().allow(room_id_or_pattern, permissions)
        return self

    def authorize(self) -> AuthorizeUserResponse:
        body = self._build_request_body()
        return self._client.authorize_user(body=body)


class AsyncSession(_BaseSession):
    """Asynchronous session. Created by ``AsyncLiveblocks.prepare_session()``.

    Usage::

        session = client.prepare_session("user-123")
        session.allow("my-room", session.FULL_ACCESS)
        result = await session.authorize()
    """

    def __init__(
        self,
        client: AsyncLiveblocks,
        user_id: str,
        user_info: dict[str, Any] | None = None,
        organization_id: str | None = None,
    ) -> None:
        super().__init__(user_id, user_info=user_info, organization_id=organization_id)
        self._client = client

    def allow(self, room_id_or_pattern: str, permissions: Sequence[Permission]) -> AsyncSession:
        super().allow(room_id_or_pattern, permissions)
        return self

    async def authorize(self) -> AuthorizeUserResponse:
        body = self._build_request_body()
        return await self._client.authorize_user(body=body)
