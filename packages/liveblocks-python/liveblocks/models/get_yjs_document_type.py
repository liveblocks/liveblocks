from enum import Enum


class GetYjsDocumentType(str, Enum):
    YARRAY = "yarray"
    YMAP = "ymap"
    YTEXT = "ytext"
    YXMLFRAGMENT = "yxmlfragment"
    YXMLTEXT = "yxmltext"

    def __str__(self) -> str:
        return str(self.value)
