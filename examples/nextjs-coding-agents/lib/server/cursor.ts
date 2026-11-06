import { gateway } from "@ai-sdk/gateway";
import { Agent, Cursor } from "@cursor/sdk";
import { createHash } from "node:crypto";

export type ModelOption = {
  id: string;
  displayName: string;
  description?: string;
  // The same model on Vercel AI Gateway, which writes quick answers; set
  // whenever the Gateway catalog is available
  gatewayId?: string;
};

export const DEFAULT_MODEL_ID = process.env.CURSOR_MODEL ?? "claude-sonnet-4-6";

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
 *
 * One model drives both the coding sessions (through Cursor) and the quick
 * answers (through Vercel AI Gateway), so when Gateway is configured the
 * list is narrowed to models both catalogs serve, matched by id and display
 * name with punctuation ignored (`claude-opus-5-5` ↔
 * `anthropic/claude-opus-5.5`). Cursor-only models like Composer drop out.
 * Without Gateway credentials there are no quick answers, so the full
 * Cursor list is used.
 */
export async function listModels(): Promise<ModelOption[]> {
  if (modelsCache && Date.now() - modelsCache.fetchedAt < MODELS_TTL_MS) {
    return modelsCache.models;
  }

  const [cursorModels, gatewayModels] = await Promise.all([
    Cursor.models.list({ apiKey: getCursorApiKey() }),
    listGatewayModels(),
  ]);

  let options: ModelOption[] = cursorModels.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    description: model.description,
  }));

  if (gatewayModels) {
    // Ids are the reliable key; display names only fill gaps (Gateway
    // names aren't unique, e.g. a "Pro" variant listed as plain "GPT 5.2")
    const byId = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const model of gatewayModels) {
      byId.set(
        normalizeModelKey(model.id.split("/").pop() ?? model.id),
        model.id
      );
      const name = normalizeModelKey(model.name);
      if (!byName.has(name)) {
        byName.set(name, model.id);
      }
    }
    options = options.flatMap((option) => {
      const id = normalizeModelKey(option.id);
      const name = normalizeModelKey(option.displayName);
      const gatewayId =
        byId.get(id) ?? byId.get(name) ?? byName.get(id) ?? byName.get(name);
      return gatewayId ? [{ ...option, gatewayId }] : [];
    });
  }

  modelsCache = { fetchedAt: Date.now(), models: options };
  return options;
}

/** `claude-opus-5-5`, `claude-opus-5.5`, `Claude Opus 5.5` → `claudeopus55` */
function normalizeModelKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Language models on AI Gateway, or null when Gateway isn't configured (no
 * key locally, no OIDC token on Vercel) or can't be reached.
 */
async function listGatewayModels(): Promise<
  { id: string; name: string }[] | null
> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return null;
  }
  try {
    const { models } = await gateway.getAvailableModels();
    return models
      .filter((model) => model.modelType === "language" || !model.modelType)
      .map((model) => ({ id: model.id, name: model.name }));
  } catch (error) {
    console.warn("[models] couldn't list AI Gateway models", error);
    return null;
  }
}

/**
 * The AI Gateway model for quick answers in a chat that uses `cursorModelId`
 * for coding: the same model when the catalogs match, else `AI_CHAT_MODEL`.
 */
export async function resolveGatewayModelId(cursorModelId: string) {
  const fallback = process.env.AI_CHAT_MODEL || DEFAULT_GATEWAY_MODEL_ID;
  try {
    const models = await listModels();
    return (
      models.find((model) => model.id === cursorModelId)?.gatewayId ?? fallback
    );
  } catch {
    return fallback;
  }
}

/** Used for quick answers when the chat's model has no Gateway counterpart */
export const DEFAULT_GATEWAY_MODEL_ID = "anthropic/claude-haiku-4.5";

/**
 * The model to actually run with. A chat's model is stored in feed metadata
 * and the default comes from `CURSOR_MODEL`, so either can name a model the
 * key can't use (a typo, or a model that was retired). Rather than fail the
 * run, fall back to the configured default, then to the first model in the
 * catalog. If the catalog can't be fetched, the requested id is used as is.
 */
export async function resolveModelId(requested: string): Promise<string> {
  let models: ModelOption[];
  try {
    models = await listModels();
  } catch {
    return requested;
  }
  if (models.length === 0 || models.some((model) => model.id === requested)) {
    return requested;
  }

  const fallback = models.some((model) => model.id === DEFAULT_MODEL_ID)
    ? DEFAULT_MODEL_ID
    : models[0].id;
  console.warn(
    `Model "${requested}" is not available to this Cursor API key; using "${fallback}"`
  );
  return fallback;
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
export function getCursorAgentIdForFeed(
  roomId: string,
  feedId: string,
  repoUrl?: string
) {
  // A cloud agent's repositories are fixed at creation, so a chat that gets
  // a repository later needs a different agent than the one it had without
  const hash = createHash("sha1")
    .update(`${roomId}/${feedId}${repoUrl ? `#${repoUrl}` : ""}`)
    .digest("hex");
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
