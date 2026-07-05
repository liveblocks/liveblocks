import { LanguageModel } from "ai";

// Plain `provider/model` ids are resolved through the Vercel AI Gateway,
// authenticated with the `AI_GATEWAY_API_KEY` environment variable.
export const aiModel: LanguageModel = "openai/gpt-5.2-codex";
