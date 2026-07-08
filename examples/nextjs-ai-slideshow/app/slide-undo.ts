"use client";

import { useRoom } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { getSlideIds, getSlideText, slideTextKey, SLIDES_ARRAY_KEY } from "./slide-doc";

export const VISUAL_EDIT_ORIGIN = "visual-edit";

type UndoState = {
  canUndo: boolean;
  canRedo: boolean;
};

type UndoCache = {
  undoManager: Y.UndoManager;
  addedSlideKeys: Set<string>;
};

const undoManagers = new WeakMap<Y.Doc, UndoCache>();

function getUndoCache(ydoc: Y.Doc): UndoCache {
  const existing = undoManagers.get(ydoc);
  if (existing) {
    return existing;
  }

  const undoManager = new Y.UndoManager([], {
    doc: ydoc,
    trackedOrigins: new Set([VISUAL_EDIT_ORIGIN]),
    captureTimeout: Number.MAX_SAFE_INTEGER,
  });
  const cache = { undoManager, addedSlideKeys: new Set<string>() };
  undoManagers.set(ydoc, cache);
  return cache;
}

function addSlidesToScope(ydoc: Y.Doc, cache: UndoCache) {
  for (const id of getSlideIds(ydoc)) {
    const key = slideTextKey(id);
    if (cache.addedSlideKeys.has(key)) {
      continue;
    }

    cache.undoManager.addToScope(getSlideText(ydoc, id));
    cache.addedSlideKeys.add(key);
  }
}

function getUndoState(undoManager: Y.UndoManager): UndoState {
  return {
    canUndo: undoManager.canUndo(),
    canRedo: undoManager.canRedo(),
  };
}

export function useSlideUndo(): {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  stopCapturing: () => void;
} {
  const room = useRoom();
  const provider = getYjsProviderForRoom(room);
  const ydoc = provider.getYDoc();
  const cache = useMemo(() => getUndoCache(ydoc), [ydoc]);
  const { undoManager } = cache;
  const [state, setState] = useState(() => getUndoState(undoManager));

  useEffect(() => {
    const slides = ydoc.getArray<string>(SLIDES_ARRAY_KEY);
    const updateScope = () => {
      addSlidesToScope(ydoc, cache);
    };
    const updateState = () => {
      setState(getUndoState(undoManager));
    };

    updateScope();
    updateState();
    slides.observe(updateScope);
    undoManager.on("stack-item-added", updateState);
    undoManager.on("stack-item-popped", updateState);
    undoManager.on("stack-cleared", updateState);

    return () => {
      slides.unobserve(updateScope);
      undoManager.off("stack-item-added", updateState);
      undoManager.off("stack-item-popped", updateState);
      undoManager.off("stack-cleared", updateState);
    };
  }, [cache, undoManager, ydoc]);

  const undo = useCallback(() => {
    undoManager.undo();
    setState(getUndoState(undoManager));
  }, [undoManager]);

  const redo = useCallback(() => {
    undoManager.redo();
    setState(getUndoState(undoManager));
  }, [undoManager]);

  const stopCapturing = useCallback(() => {
    undoManager.stopCapturing();
  }, [undoManager]);

  return {
    undo,
    redo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    stopCapturing,
  };
}
