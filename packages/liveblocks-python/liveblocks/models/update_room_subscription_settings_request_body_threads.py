from enum import Enum


class UpdateRoomSubscriptionSettingsRequestBodyThreads(str, Enum):
    ALL = "all"
    NONE = "none"
    REPLIES_AND_MENTIONS = "replies_and_mentions"

    def __str__(self) -> str:
        return str(self.value)
