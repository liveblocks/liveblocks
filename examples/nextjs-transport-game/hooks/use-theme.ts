"use client";

import { useCallback } from "react";
import { type Theme, THEMES } from "@/game/render/theme";
import { usePreference } from "./use-preference";

// The look of the map this player picked
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [id, setId] = usePreference("transport-game:theme");
  const setTheme = useCallback((theme: Theme) => setId(theme.id), [setId]);
  return [THEMES.find((theme) => theme.id === id) ?? THEMES[0], setTheme];
}
