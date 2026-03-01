from enum import Enum


class RoomSubscriptionSettingsTextMentions(str, Enum):
    MINE = "mine"
    NONE = "none"

    def __str__(self) -> str:
        return str(self.value)
