from enum import Enum


class RoomType(str, Enum):
    ROOM = "room"

    def __str__(self) -> str:
        return str(self.value)
