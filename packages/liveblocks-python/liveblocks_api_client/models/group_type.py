from enum import Enum


class GroupType(str, Enum):
    GROUP = "group"

    def __str__(self) -> str:
        return str(self.value)
