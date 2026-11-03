import { useCallback, useState } from "react";

export type PanelWidthConfig = {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
};

export const SIDEBAR_PANEL: PanelWidthConfig = {
  storageKey: "liveblocks-messaging-app:sidebar-width",
  defaultWidth: 280,
  minWidth: 200,
  maxWidth: 480,
};

export const THREAD_PANEL: PanelWidthConfig = {
  storageKey: "liveblocks-messaging-app:thread-panel-width",
  defaultWidth: 380,
  minWidth: 300,
  maxWidth: 640,
};

export function clampPanelWidth(width: number, config: PanelWidthConfig) {
  if (!Number.isFinite(width)) {
    return config.defaultWidth;
  }
  return Math.min(
    config.maxWidth,
    Math.max(config.minWidth, Math.round(width))
  );
}

export function readPanelWidth(config: PanelWidthConfig) {
  if (typeof window === "undefined") {
    return config.defaultWidth;
  }
  try {
    const stored = localStorage.getItem(config.storageKey);
    if (stored === null) {
      return config.defaultWidth;
    }
    return clampPanelWidth(Number(stored), config);
  } catch {
    return config.defaultWidth;
  }
}

export function writePanelWidth(config: PanelWidthConfig, width: number) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(config.storageKey, String(width));
  } catch {}
}

export function usePanelWidth(
  config: PanelWidthConfig
): [number, (width: number) => void] {
  const [width, setWidth] = useState(() => readPanelWidth(config));

  const updateWidth = useCallback(
    (next: number) => {
      const clamped = clampPanelWidth(next, config);
      setWidth(clamped);
      writePanelWidth(config, clamped);
    },
    [config]
  );

  return [width, updateWidth];
}
