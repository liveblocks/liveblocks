from enum import Enum


class GetYjsVersionsDataItemType(str, Enum):
    HISTORYVERSION = "historyVersion"

    def __str__(self) -> str:
        return str(self.value)
