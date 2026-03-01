from enum import Enum


class ManagementProjectRegion(str, Enum):
    EARTH = "earth"
    EU = "eu"
    FEDRAMP = "fedramp"

    def __str__(self) -> str:
        return str(self.value)
