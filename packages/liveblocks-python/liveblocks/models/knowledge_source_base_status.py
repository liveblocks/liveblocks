from enum import StrEnum


class KnowledgeSourceBaseStatus(StrEnum):
    ERROR = "error"
    INGESTING = "ingesting"
    READY = "ready"
