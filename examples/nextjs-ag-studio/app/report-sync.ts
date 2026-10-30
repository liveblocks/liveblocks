import type { Json, JsonObject } from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import type { AgPageState, AgReportState } from "ag-studio";
import type { StoredPage } from "../liveblocks.config";

/**
 * Converts between AG Studio's report state and the Liveblocks Storage schema
 * declared in liveblocks.config.ts.
 *
 * AG Studio's state is documented to be plain, serialisable JSON
 * (https://www.ag-grid.com/studio/react/state/), but its TypeScript types are
 * rich interfaces that TypeScript cannot relate to Liveblocks' `Json`. The two
 * casts below centralise that boundary instead of scattering casts around.
 */
function toJson(value: unknown): Json {
  // Safe: AG Studio state is plain JSON by documented contract.
  return value as Json;
}

function toPageState(value: Record<string, unknown>): AgPageState {
  // Safe: the object was produced from an `AgPageState` by `pageToStored()`
  // (modulo the Storage round-trip, which preserves JSON values).
  return value as unknown as AgPageState;
}

/**
 * The immutable snapshot shape of a StoredPage, as returned by useStorage
 * (LiveMaps and LiveObjects become plain readonly objects). Values are typed
 * as `unknown` because the snapshot's readonly-Json types are internal to
 * Liveblocks; report-sync treats them as opaque JSON either way.
 */
export type StoredPageSnapshot = {
  readonly widgets: { readonly [widgetId: string]: unknown };
  readonly widgetLayout: { readonly [widgetId: string]: unknown };
  readonly rest: { readonly [key: string]: unknown };
};

export type StorageSnapshot = {
  readonly version: string | null;
  readonly pageOrder: readonly string[];
  readonly pages: { readonly [pageId: string]: StoredPageSnapshot };
};

/**
 * Order-insensitive deep equality for plain JSON values. Reference equality is
 * the fast path: AG Studio state is immutable and Liveblocks snapshots use
 * structural sharing, so unchanged subtrees usually keep their identity.
 * Keys holding `undefined` are ignored, matching JSON serialisation.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const recordA = a as Record<string, unknown>;
    const recordB = b as Record<string, unknown>;
    const keysA = Object.keys(recordA).filter(
      (key) => recordA[key] !== undefined
    );
    const keysB = Object.keys(recordB).filter(
      (key) => recordB[key] !== undefined
    );
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every((key) => deepEqual(recordA[key], recordB[key]));
  }
  return false;
}

/** Entries of a widget-keyed record, with `undefined` values dropped. */
function recordEntries(
  record: Partial<Record<string, unknown>> | undefined
): [string, Json][] {
  return Object.entries(record ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, toJson(value)]);
}

/**
 * Everything on a page that is shared but not widget-keyed. The active
 * `selection` is deliberately excluded — it is per-user UI state, like the
 * selected page and the sidebar panels at the report level.
 */
function pageRest(page: AgPageState): JsonObject {
  const rest: JsonObject = {};
  if (page.layout !== undefined) {
    rest.layout = toJson(page.layout);
  }
  if (page.filter !== undefined) {
    rest.filter = toJson(page.filter);
  }
  if (page.crossFilter !== undefined) {
    rest.crossFilter = toJson(page.crossFilter);
  }
  if (page.schema !== undefined) {
    rest.schema = toJson(page.schema);
  }
  return rest;
}

function pageToStored(page: AgPageState): StoredPage {
  return new LiveObject({
    widgets: new LiveMap(recordEntries(page.widgets)),
    widgetLayout: new LiveMap(recordEntries(page.widgetLayout)),
    rest: pageRest(page),
  });
}

/** Builds the `initialStorage` for a room from a full report state. */
export function reportToInitialStorage(
  state: AgReportState
): Liveblocks["Storage"] {
  return {
    version: state.version ?? null,
    pageOrder: new LiveList(state.pages.map((page) => page.id)),
    pages: new LiveMap(
      state.pages.map((page) => [page.id, pageToStored(page)])
    ),
  };
}

/**
 * Makes a LiveMap of widget entries match a record from AG Studio state,
 * writing only entries that actually changed. This is what makes the example
 * "per-widget": concurrent edits to different widgets touch different keys
 * and merge cleanly.
 */
function reconcileMap(
  map: LiveMap<string, Json>,
  record: Partial<Record<string, unknown>> | undefined
): void {
  const entries = recordEntries(record);
  const keys = new Set(entries.map(([key]) => key));
  for (const key of Array.from(map.keys())) {
    if (!keys.has(key)) {
      map.delete(key);
    }
  }
  for (const [key, value] of entries) {
    if (!map.has(key) || !deepEqual(map.get(key), value)) {
      map.set(key, value);
    }
  }
}

/**
 * Makes Storage match a report state emitted by AG Studio, writing only the
 * parts that differ. Because it never writes values that are already equal,
 * it is idempotent: applying a remote update and feeding the resulting
 * `stateUpdated` event back through here produces no writes (and no loops).
 */
export function reconcileStorage(
  root: LiveObject<Liveblocks["Storage"]>,
  state: AgReportState
): void {
  const version = state.version ?? null;
  if (root.get("version") !== version) {
    root.set("version", version);
  }

  const pages = root.get("pages");
  const ids = state.pages.map((page) => page.id);

  // Pages deleted locally
  for (const id of Array.from(pages.keys())) {
    if (!ids.includes(id)) {
      pages.delete(id);
    }
  }

  // Pages added or changed locally
  for (const page of state.pages) {
    const stored = pages.get(page.id);
    if (!stored) {
      pages.set(page.id, pageToStored(page));
      continue;
    }
    reconcileMap(stored.get("widgets"), page.widgets);
    reconcileMap(stored.get("widgetLayout"), page.widgetLayout);
    const rest = pageRest(page);
    if (!deepEqual(stored.get("rest"), rest)) {
      stored.set("rest", rest);
    }
  }

  // Page tab order
  const order = root.get("pageOrder");
  const currentOrder = Array.from(order);
  if (
    currentOrder.length !== ids.length ||
    currentOrder.some((id, index) => id !== ids[index])
  ) {
    order.clear();
    for (const id of ids) {
      order.push(id);
    }
  }
}

// Cache of converted pages, keyed on the immutable page snapshot. Liveblocks
// snapshots keep unchanged subtrees reference-equal across updates, and AG
// Studio uses reference equality to decide what changed — so reusing the same
// converted object means unchanged pages are not re-rendered.
const pageCache = new WeakMap<StoredPageSnapshot, AgPageState>();

function buildPage(id: string, stored: StoredPageSnapshot): AgPageState {
  const cached = pageCache.get(stored);
  if (cached && cached.id === id) {
    return cached;
  }
  const page = toPageState({
    ...stored.rest,
    id,
    widgets: stored.widgets,
    widgetLayout: stored.widgetLayout,
  });
  pageCache.set(stored, page);
  return page;
}

/** Builds the shared pages array from a Storage snapshot. */
export function buildPagesFromSnapshot(
  snapshot: StorageSnapshot
): AgPageState[] {
  const pages: AgPageState[] = [];
  for (const id of snapshot.pageOrder) {
    const stored = snapshot.pages[id];
    if (stored) {
      pages.push(buildPage(id, stored));
    }
  }
  // Storage is seeded with pages, but guard against the (concurrent-deletes)
  // edge case of a report with no pages left: AG Studio needs at least one.
  if (pages.length === 0) {
    pages.push({ id: "page-1" });
  }
  return pages;
}

/** A page without its per-user parts, for "did the shared state change?" checks. */
export function stripLocalPageState(page: AgPageState): AgPageState {
  if (page.selection === undefined) {
    return page;
  }
  const { selection: _selection, ...shared } = page;
  return shared;
}
