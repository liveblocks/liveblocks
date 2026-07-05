import { openai } from "@ai-sdk/openai";
import { LanguageModel } from "ai";

export const aiModel: LanguageModel = openai("gpt-5.2-codex");
