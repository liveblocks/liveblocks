from enum import Enum


class RoomSubscriptionSettingsThreads(str, Enum):
    ALL = "all"
    NONE = "none"
    REPLIES_AND_MENTIONS = "replies_and_mentions"

    def __str__(self) -> str:
        return str(self.value)
