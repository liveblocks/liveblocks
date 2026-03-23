from enum import StrEnum


class RoomAccessesAdditionalPropertyItem(StrEnum):
    COMMENTSWRITE = "comments:write"
    ROOMPRESENCEWRITE = "room:presence:write"
    ROOMREAD = "room:read"
    ROOMWRITE = "room:write"
