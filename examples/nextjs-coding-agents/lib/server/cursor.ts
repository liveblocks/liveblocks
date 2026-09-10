import { Agent, Cursor } from "@cursor/sdk";
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

// Cursor rate-limits this endpoint to about one request per minute and it
// can take a while for accounts with many repositories, so it's cached
// generously and refreshed in the background.
const REPOS_TTL_MS = 10 * 60 * 1000;
let reposCache: { fetchedAt: number; repos: string[] } | null = null;
let reposInFlight$: Promise<string[]> | null = null;

/**
 * GitHub repositories the Cursor GitHub App can reach for this API key. This
 * is what the agent can clone and push to, so it's the list people pick
 * from when starting a chat.
 */
export async function listRepositories(): Promise<string[]> {
  if (reposCache && Date.now() - reposCache.fetchedAt < REPOS_TTL_MS) {
    return reposCache.repos;
  }

  reposInFlight$ ??= Cursor.repositories
    .list({ apiKey: getCursorApiKey() })
    .then((repos) => {
      const urls = repos
        .map((repo) => repo.url)
        .sort((a, b) => a.localeCompare(b));
      reposCache = { fetchedAt: Date.now(), repos: urls };
      return urls;
    })
    .finally(() => {
      reposInFlight$ = null;
    });

  // Serve the stale list while a refresh is running rather than blocking
  if (reposCache) {
    return reposCache.repos;
  }
  return reposInFlight$;
}

/**
 * Downloads an artifact the agent produced. Cloud agent workspaces persist
 * across runs, so the file reflects the latest run that wrote it.
 */
export async function downloadArtifact(cursorAgentId: string, path: string) {
  const agent = await Agent.resume(cursorAgentId, {
    apiKey: getCursorApiKey(),
  });
  try {
    return await agent.downloadArtifact(path);
  } finally {
    agent.close();
  }
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
