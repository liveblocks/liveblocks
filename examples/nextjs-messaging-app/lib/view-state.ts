import type { Selection, SidebarTab } from "./navigation";

export type ViewState = {
  view: SidebarTab;
  selection: Selection | null;
  threadMessageId: string | null;
};

export const DEFAULT_VIEW_STATE: ViewState = {
  view: "home",
  selection: null,
  threadMessageId: null,
};

const STORAGE_KEY_PREFIX = "liveblocks-messaging-app:view:";
const SIDEBAR_TABS: readonly SidebarTab[] = ["home", "dms", "activity"];

export function getViewStateKey(roomId: string) {
  return `${STORAGE_KEY_PREFIX}${roomId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSidebarTab(value: unknown): value is SidebarTab {
  return typeof value === "string" && SIDEBAR_TABS.some((tab) => tab === value);
}

function parseSelection(value: unknown): Selection | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value.type === "channel" && typeof value.channelId === "string") {
    return { type: "channel", channelId: value.channelId };
  }
  if (value.type === "dm" && typeof value.userId === "string") {
    return { type: "dm", userId: value.userId };
  }
  return null;
}

export function parseViewState(raw: string | null): ViewState | null {
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isSidebarTab(parsed.view)) {
    return null;
  }
  return {
    view: parsed.view,
    selection: parseSelection(parsed.selection),
    threadMessageId:
      typeof parsed.threadMessageId === "string"
        ? parsed.threadMessageId
        : null,
  };
}

function readFrom(storage: Storage | undefined, key: string) {
  try {
    return parseViewState(storage?.getItem(key) ?? null);
  } catch {
    return null;
  }
}

export function readViewState(roomId: string): ViewState {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW_STATE;
  }
  const key = getViewStateKey(roomId);
  return (
    readFrom(window.sessionStorage, key) ??
    readFrom(window.localStorage, key) ??
    DEFAULT_VIEW_STATE
  );
}

export function writeViewState(roomId: string, state: ViewState) {
  if (typeof window === "undefined") {
    return;
  }
  const key = getViewStateKey(roomId);
  const serialized = JSON.stringify(state);
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      storage.setItem(key, serialized);
    } catch {}
  }
}
