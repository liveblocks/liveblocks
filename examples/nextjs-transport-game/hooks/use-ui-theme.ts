"use client";

import { useCallback, useEffect } from "react";
import { usePreference } from "./use-preference";

// A look for the game's windows and buttons. What each one looks like is in
// `app/globals.css`, under its id.
export type UiTheme = { id: string; name: string };

export const UI_THEMES: readonly UiTheme[] = [
  { id: "classic", name: "Classic" },
  { id: "modern", name: "Modern" },
  { id: "mac", name: "Mac" },
  { id: "flat", name: "Flat" },
  { id: "dark", name: "Dark" },
  { id: "glass", name: "Glass" },
  { id: "terminal", name: "Terminal" },
];

// The look of the interface this player picked, which goes with any look of
// the map. It applies to the whole page for as long as the game is on it.
export function useUiTheme(): [UiTheme, (theme: UiTheme) => void] {
  const [id, setId] = usePreference("transport-game:ui");
  const theme = UI_THEMES.find((each) => each.id === id) ?? UI_THEMES[0];

  useEffect(() => {
    document.documentElement.dataset.ui = theme.id;
    return () => {
      delete document.documentElement.dataset.ui;
    };
  }, [theme]);

  const setTheme = useCallback((next: UiTheme) => setId(next.id), [setId]);
  return [theme, setTheme];
}
