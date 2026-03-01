from enum import Enum


class GetRoomsRoomIdYdocType(str, Enum):
    YARRAY = "yarray"
    YMAP = "ymap"
    YTEXT = "ytext"
    YXMLFRAGMENT = "yxmlfragment"
    YXMLTEXT = "yxmltext"

    def __str__(self) -> str:
        return str(self.value)
