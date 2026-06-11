from enum import StrEnum


class RoomPermissionItem(StrEnum):
    READ = "*:read"
    WRITE = "*:write"
    COMMENTSREAD = "comments:read"
    COMMENTSNONE = "comments:none"
    COMMENTSWRITE = "comments:write"
    FEEDSREAD = "feeds:read"
    FEEDSNONE = "feeds:none"
    FEEDSWRITE = "feeds:write"
    ROOMPRESENCEWRITE = "room:presence:write"
    ROOMREAD = "room:read"
    ROOMWRITE = "room:write"
    STORAGENONE = "storage:none"
    STORAGEREAD = "storage:read"
    STORAGEWRITE = "storage:write"
