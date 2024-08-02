import type { PropsWithChildren } from "react";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import browser from "webextension-polyfill";

const MEDIA_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const THEMES: Theme[] = ["light", "dark"];

export type Theme = "light" | "dark";

interface Props extends PropsWithChildren {
  devtools?: boolean;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

function getTheme(devtools: boolean): Theme {
  if (devtools && browser.devtools.panels.themeName === "dark") {
    return "dark";
  } else {
    return MEDIA_QUERY.matches ? "dark" : "light";
  }
}

export function ThemeProvider({ devtools = false, children }: Props) {
  const [theme, setTheme] = useState<Theme>(() => getTheme(devtools));

  useLayoutEffect(() => {
    function handleThemeChange() {
      const theme = getTheme(devtools);

      document.documentElement.classList.remove(...THEMES);
      document.documentElement.classList.add(theme);

      setTheme(theme);
    }

    MEDIA_QUERY.addEventListener("change", handleThemeChange);
    handleThemeChange();

    return () => {
      MEDIA_QUERY.removeEventListener("change", handleThemeChange);
    };
  }, [devtools]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
