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
import { shallow } from "@liveblocks/client";
import { useStorage } from "@liveblocks/react/suspense";
import { cellKey, type CellFormat } from "@/liveblocks.config";

// A single subscription to every cell's formatting, indexed by cell key. Each
// cell reads its own format via `useSyncExternalStore`, so the hundreds of
// cells mounted/unmounted during virtualized scrolling don't each open a
// `useStorage` subscription (which is the dominant per-cell scroll cost).
//
// Mirrors `CellPresenceContext`. The map is rebuilt synchronously during render
// (so a freshly-mounted cell reads its format immediately, with no one-frame
// "unformatted" flash while scrolling), and listeners are notified in an effect.
type Store = {
  byCell: Map<string, CellFormat>;
  listeners: Map<string, Set<() => void>>;
};

type CellFormatContextValue = {
  subscribe: (key: string, onChange: () => void) => () => void;
  getFormat: (key: string) => CellFormat | undefined;
};

const CellFormatContext = createContext<CellFormatContextValue | null>(null);

export function CellFormatProvider({ children }: { children: ReactNode }) {
  // Only cells that actually have formatting; value-only edits don't change
  // this projection (shallow-equal), so they don't churn the provider.
  const formats = useStorage((root) => {
    const out: Record<string, CellFormat> = {};
    for (const [key, cell] of Object.entries(root.cells)) {
      if (cell.format) {
        out[key] = cell.format;
      }
    }
    return out;
  }, shallow);

  const storeRef = useRef<Store | null>(null);
  if (!storeRef.current) {
    storeRef.current = { byCell: new Map(), listeners: new Map() };
  }
  const store = storeRef.current;

  // Reconcile the per-cell map during render, reusing previous entries for
  // unchanged cells so each cell's snapshot stays referentially stable, and
  // remember which cells changed so we can notify them after commit.
  const changedKeysRef = useRef<string[]>([]);
  useMemo(() => {
    const prev = store.byCell;
    const next = new Map<string, CellFormat>();
    const changed: string[] = [];
    for (const key in formats) {
      const before = prev.get(key);
      const format = formats[key];
      if (before && shallow(before, format)) {
        next.set(key, before);
      } else {
        next.set(key, format);
        changed.push(key);
      }
    }
    for (const key of prev.keys()) {
      if (!(key in formats)) {
        changed.push(key);
      }
    }
    store.byCell = next;
    changedKeysRef.current = changed;
  }, [formats, store]);

  useEffect(() => {
    for (const key of changedKeysRef.current) {
      const listeners = store.listeners.get(key);
      if (listeners) {
        for (const onChange of listeners) {
          onChange();
        }
      }
    }
    changedKeysRef.current = [];
  }, [formats, store]);

  const value = useMemo<CellFormatContextValue>(
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
      getFormat: (key) => store.byCell.get(key),
    }),
    [store]
  );

  return (
    <CellFormatContext.Provider value={value}>
      {children}
    </CellFormatContext.Provider>
  );
}

function useCellFormatContext(): CellFormatContextValue {
  const context = useContext(CellFormatContext);
  if (!context) {
    throw new Error("useCellFormat must be used within a CellFormatProvider");
  }
  return context;
}

export function useCellFormat(
  rowId: string,
  colId: string
): CellFormat | undefined {
  const { subscribe, getFormat } = useCellFormatContext();
  const key = cellKey(rowId, colId);
  const subscribeToCell = useCallback(
    (onChange: () => void) => subscribe(key, onChange),
    [subscribe, key]
  );
  const getSnapshot = useCallback(() => getFormat(key), [getFormat, key]);
  return useSyncExternalStore(subscribeToCell, getSnapshot, getSnapshot);
}
