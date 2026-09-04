import { Cursor } from "@cursor/sdk";
import { createHash } from "node:crypto";

export type ModelOption = {
  id: string;
  displayName: string;
  description?: string;
};

export const DEFAULT_MODEL_ID = process.env.CURSOR_MODEL ?? "composer-2.5";

export function getCursorApiKey() {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new Error("Missing CURSOR_API_KEY");
  }
  return apiKey;
}

export function hasCursorApiKey() {
  return Boolean(process.env.CURSOR_API_KEY);
}

const MODELS_TTL_MS = 10 * 60 * 1000;
let modelsCache: { fetchedAt: number; models: ModelOption[] } | null = null;

/**
 * Lists the models available to the configured Cursor API key. The catalog
 * is account-specific and can change, so it's discovered at runtime and
 * cached per server process rather than hard-coded.
 */
export async function listModels(): Promise<ModelOption[]> {
  if (modelsCache && Date.now() - modelsCache.fetchedAt < MODELS_TTL_MS) {
    return modelsCache.models;
  }

  const models = await Cursor.models.list({ apiKey: getCursorApiKey() });
  const options = models.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    description: model.description,
  }));

  modelsCache = { fetchedAt: Date.now(), models: options };
  return options;
}

/**
 * Cursor lets callers pick the cloud agent id. Deriving it from the feed id
 * makes agent creation idempotent: if two people post the first message at
 * the same time, only one `Agent.create` succeeds and the other resumes it.
 */
export function getCursorAgentIdForFeed(roomId: string, feedId: string) {
  const hash = createHash("sha1").update(`${roomId}/${feedId}`).digest("hex");
  // Format the hash as a UUID (version 5 style, name-based)
  const uuid = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0")}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join("-");
  return `bc-${uuid}`;
}
