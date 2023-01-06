import type { PropsWithChildren } from "react";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import browser from "webextension-polyfill";

const MEDIA_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const THEMES: Theme[] = ["light", "dark"];

export type Theme = "light" | "dark";

const ThemeContext = createContext<Theme | undefined>(undefined);

function getTheme(): Theme {
  if (browser.devtools.panels.themeName === "dark") {
    return "dark";
  } else {
    return MEDIA_QUERY.matches ? "dark" : "light";
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(getTheme);

  useLayoutEffect(() => {
    function handleThemeChange() {
      const theme = getTheme();

      document.documentElement.classList.remove(...THEMES);
      document.documentElement.classList.add(theme);

      setTheme(theme);
    }

    MEDIA_QUERY.addEventListener("change", handleThemeChange);
    handleThemeChange();

    return () => {
      MEDIA_QUERY.removeEventListener("change", handleThemeChange);
    };
  }, []);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
