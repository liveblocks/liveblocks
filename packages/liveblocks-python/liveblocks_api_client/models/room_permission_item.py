from enum import Enum


class RoomPermissionItem(str, Enum):
    COMMENTSWRITE = "comments:write"
    ROOMPRESENCEWRITE = "room:presence:write"
    ROOMREAD = "room:read"
    ROOMWRITE = "room:write"

    def __str__(self) -> str:
        return str(self.value)
