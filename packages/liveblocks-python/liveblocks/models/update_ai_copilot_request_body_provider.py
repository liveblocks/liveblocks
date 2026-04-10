from enum import StrEnum


class UpdateAiCopilotRequestBodyProvider(StrEnum):
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OPENAI = "openai"
    OPENAI_COMPATIBLE = "openai-compatible"
