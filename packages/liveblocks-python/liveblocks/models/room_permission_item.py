from enum import StrEnum


class RoomPermissionItem(StrEnum):
    COMMENTSREAD = "comments:read"
    COMMENTSWRITE = "comments:write"
    FEEDSWRITE = "feeds:write"
    ROOMCOMMENTSNONE = "room:comments:none"
    ROOMCOMMENTSREAD = "room:comments:read"
    ROOMCOMMENTSWRITE = "room:comments:write"
    ROOMFEEDSNONE = "room:feeds:none"
    ROOMFEEDSREAD = "room:feeds:read"
    ROOMFEEDSWRITE = "room:feeds:write"
    ROOMPRESENCENONE = "room:presence:none"
    ROOMPRESENCEREAD = "room:presence:read"
    ROOMPRESENCEWRITE = "room:presence:write"
    ROOMREAD = "room:read"
    ROOMSTORAGENONE = "room:storage:none"
    ROOMSTORAGEREAD = "room:storage:read"
    ROOMSTORAGEWRITE = "room:storage:write"
    ROOMWRITE = "room:write"
