from enum import StrEnum


class WebKnowledgeSourceLinkStatus(StrEnum):
    ERROR = "error"
    INGESTING = "ingesting"
    READY = "ready"
