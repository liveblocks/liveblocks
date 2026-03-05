from enum import Enum


class GetStorageDocumentFormat(str, Enum):
    JSON = "json"
    PLAIN_LSON = "plain-lson"

    def __str__(self) -> str:
        return str(self.value)
