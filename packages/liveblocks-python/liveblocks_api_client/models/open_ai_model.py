from enum import Enum


class OpenAiModel(str, Enum):
    GPT_4 = "gpt-4"
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4_1 = "gpt-4.1"
    GPT_4_1_MINI = "gpt-4.1-mini"
    GPT_4_1_NANO = "gpt-4.1-nano"
    GPT_4_TURBO = "gpt-4-turbo"
    GPT_5 = "gpt-5"
    GPT_5_1 = "gpt-5.1"
    GPT_5_1_CHAT_LATEST = "gpt-5.1-chat-latest"
    GPT_5_1_MINI = "gpt-5.1-mini"
    GPT_5_CHAT_LATEST = "gpt-5-chat-latest"
    GPT_5_MINI = "gpt-5-mini"
    GPT_5_NANO = "gpt-5-nano"
    O1 = "o1"
    O1_MINI = "o1-mini"
    O3 = "o3"
    O3_MINI = "o3-mini"
    O4_MINI = "o4-mini"

    def __str__(self) -> str:
        return str(self.value)
