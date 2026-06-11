from enum import StrEnum


class RoomPermissionItem(StrEnum):
    COMMENTSNONE = "comments:none"
    COMMENTSREAD = "comments:read"
    COMMENTSWRITE = "comments:write"
    FEEDSNONE = "feeds:none"
    FEEDSREAD = "feeds:read"
    FEEDSWRITE = "feeds:write"
    ROOMPRESENCEWRITE = "room:presence:write"
    ROOMREAD = "room:read"
    ROOMWRITE = "room:write"
    STORAGENONE = "storage:none"
    STORAGEREAD = "storage:read"
    STORAGEWRITE = "storage:write"
    READ = "*:read"
    WRITE = "*:write"
