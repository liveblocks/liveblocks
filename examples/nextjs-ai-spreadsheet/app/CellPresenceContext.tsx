"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { cellKey } from "@/liveblocks.config";

// One entry per user (or AI) whose selection is on a given cell.
export type CellSelector = { name: string; color: string };

const EMPTY: CellSelector[] = [];

// A tiny per-cell store: instead of every visible cell running its own
// `useOthers` selector (hundreds of Liveblocks subscribers re-running on every
// presence tick), the provider keeps a single `useOthers` subscription, indexes
// presence into a `cellKey -> selectors` map once per change, and notifies only
// the cells whose selectors actually changed.
type Store = {
  byCell: Map<string, CellSelector[]>;
  listeners: Map<string, Set<() => void>>;
};

type CellPresenceContextValue = {
  subscribe: (key: string, onChange: () => void) => () => void;
  getSelectors: (key: string) => CellSelector[];
  currentUserId: string | undefined;
};

const CellPresenceContext = createContext<CellPresenceContextValue | null>(null);

function sameSelectors(a: CellSelector[], b: CellSelector[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].name !== b[i].name || a[i].color !== b[i].color) {
      return false;
    }
  }
  return true;
}

export function CellPresenceProvider({ children }: { children: ReactNode }) {
  const others = useOthers();
  const currentUserId = useSelf((me) => me.id) ?? undefined;

  const storeRef = useRef<Store | null>(null);
  if (!storeRef.current) {
    storeRef.current = { byCell: new Map(), listeners: new Map() };
  }
  const store = storeRef.current;

  // Re-index presence whenever it changes, reusing previous arrays for cells
  // that didn't change so each cell's snapshot stays referentially stable, and
  // notify only the cells whose selectors changed.
  useEffect(() => {
    const next = new Map<string, CellSelector[]>();
    for (const other of others) {
      const cell = other.presence.selectedCell;
      if (!cell?.rowId || !cell?.colId) {
        continue;
      }
      const key = cellKey(cell.rowId, cell.colId);
      const entry: CellSelector = {
        name: other.info?.name ?? "Someone",
        color: other.info?.color ?? "#888888",
      };
      const list = next.get(key);
      if (list) {
        list.push(entry);
      } else {
        next.set(key, [entry]);
      }
    }

    const prev = store.byCell;
    const changed = new Set<string>();
    const reconciled = new Map<string, CellSelector[]>();
    for (const [key, list] of next) {
      const before = prev.get(key);
      if (before && sameSelectors(before, list)) {
        reconciled.set(key, before);
      } else {
        reconciled.set(key, list);
        changed.add(key);
      }
    }
    for (const key of prev.keys()) {
      if (!next.has(key)) {
        changed.add(key);
      }
    }

    store.byCell = reconciled;
    for (const key of changed) {
      const listeners = store.listeners.get(key);
      if (listeners) {
        for (const onChange of listeners) {
          onChange();
        }
      }
    }
  }, [others, store]);

  const value = useMemo<CellPresenceContextValue>(
    () => ({
      subscribe: (key, onChange) => {
        let listeners = store.listeners.get(key);
        if (!listeners) {
          listeners = new Set();
          store.listeners.set(key, listeners);
        }
        listeners.add(onChange);
        return () => {
          listeners.delete(onChange);
          if (listeners.size === 0) {
            store.listeners.delete(key);
          }
        };
      },
      getSelectors: (key) => store.byCell.get(key) ?? EMPTY,
      currentUserId,
    }),
    [store, currentUserId]
  );

  return (
    <CellPresenceContext.Provider value={value}>
      {children}
    </CellPresenceContext.Provider>
  );
}

function useCellPresence(): CellPresenceContextValue {
  const context = useContext(CellPresenceContext);
  if (!context) {
    throw new Error(
      "useCellPresence must be used within a CellPresenceProvider"
    );
  }
  return context;
}

// Everyone (human or AI) whose selection is on this cell. Re-renders the cell
// only when its own selectors change, not on every presence tick.
export function useCellSelectors(rowId: string, colId: string): CellSelector[] {
  const { subscribe, getSelectors } = useCellPresence();
  const key = cellKey(rowId, colId);
  const subscribeToCell = useCallback(
    (onChange: () => void) => subscribe(key, onChange),
    [subscribe, key]
  );
  const getSnapshot = useCallback(() => getSelectors(key), [getSelectors, key]);
  return useSyncExternalStore(subscribeToCell, getSnapshot, getSnapshot);
}

export function useCurrentUserId(): string | undefined {
  return useCellPresence().currentUserId;
}
