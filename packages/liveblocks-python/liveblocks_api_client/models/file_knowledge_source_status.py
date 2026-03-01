from enum import Enum


class FileKnowledgeSourceStatus(str, Enum):
    ERROR = "error"
    INGESTING = "ingesting"
    READY = "ready"

    def __str__(self) -> str:
        return str(self.value)
