from enum import StrEnum


class RoomSubscriptionSettingsThreads(StrEnum):
    ALL = "all"
    NONE = "none"
    REPLIES_AND_MENTIONS = "replies_and_mentions"
