from enum import Enum


class GetYjsVersionsDataItemKind(str, Enum):
    YJS = "yjs"

    def __str__(self) -> str:
        return str(self.value)
