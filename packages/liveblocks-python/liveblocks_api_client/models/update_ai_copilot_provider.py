from enum import Enum


class UpdateAiCopilotProvider(str, Enum):
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OPENAI = "openai"
    OPENAI_COMPATIBLE = "openai-compatible"

    def __str__(self) -> str:
        return str(self.value)
