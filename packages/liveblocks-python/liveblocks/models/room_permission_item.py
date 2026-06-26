from enum import StrEnum


class RoomPermissionItem(StrEnum):
    COMMENTSNONE = "comments:none"
    COMMENTSPRIVATENONE = "comments:private:none"
    COMMENTSPRIVATEREAD = "comments:private:read"
    COMMENTSPRIVATEWRITE = "comments:private:write"
    COMMENTSPUBLICNONE = "comments:public:none"
    COMMENTSPUBLICREAD = "comments:public:read"
    COMMENTSPUBLICWRITE = "comments:public:write"
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
