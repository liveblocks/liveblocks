from enum import StrEnum


class UpdateRoomSubscriptionSettingsRequestBodyThreads(StrEnum):
    ALL = "all"
    NONE = "none"
    REPLIES_AND_MENTIONS = "replies_and_mentions"
