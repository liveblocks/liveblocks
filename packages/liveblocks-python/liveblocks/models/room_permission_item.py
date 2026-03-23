from enum import StrEnum


class RoomPermissionItem(StrEnum):
    COMMENTSWRITE = "comments:write"
    ROOMPRESENCEWRITE = "room:presence:write"
    ROOMREAD = "room:read"
    ROOMWRITE = "room:write"
