export type UserStatus = NonNullable<Liveblocks["Presence"]["status"]>;

export const EMPTY_STATUS: UserStatus = { emoji: null, text: "", away: false };

export const STATUS_TEXT_MAX_LENGTH = 100;

const STORAGE_KEY_PREFIX = "liveblocks-messaging-app:status:";

export function getStatusKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function hasStatus(status: UserStatus | undefined) {
  return Boolean(status && (status.emoji || status.text.trim()));
}

export function isActive(status: UserStatus | undefined) {
  return !status?.away;
}

export function normalizeStatus(status: UserStatus): UserStatus {
  return {
    emoji: status.emoji || null,
    text: status.text.trim().slice(0, STATUS_TEXT_MAX_LENGTH),
    away: status.away,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseStatus(raw: string | null): UserStatus | null {
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  return normalizeStatus({
    emoji: typeof parsed.emoji === "string" ? parsed.emoji : null,
    text: typeof parsed.text === "string" ? parsed.text : "",
    away: parsed.away === true,
  });
}

export function readStatus(userId: string): UserStatus {
  if (typeof window === "undefined") {
    return EMPTY_STATUS;
  }
  try {
    return (
      parseStatus(window.localStorage.getItem(getStatusKey(userId))) ??
      EMPTY_STATUS
    );
  } catch {
    return EMPTY_STATUS;
  }
}

export function writeStatus(userId: string, status: UserStatus) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      getStatusKey(userId),
      JSON.stringify(normalizeStatus(status))
    );
  } catch {}
}
