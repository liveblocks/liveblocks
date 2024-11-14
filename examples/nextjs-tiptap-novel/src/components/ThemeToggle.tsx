import { useState } from "react";
import { MoonIcon, SunIcon } from "@/icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  function changeTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    setTheme(isDark ? "dark" : "light");
  }

  return (
    <button
      className="p-2 rounded-lg text-muted-foreground outline-none transition-colors hover:bg-border/50 focus:bg-border/50"
      onClick={changeTheme}
      aria-label="Switch Theme"
    >
      {theme === "dark" ? (
        <SunIcon style={{ width: 18, height: 18 }} />
      ) : (
        <MoonIcon style={{ width: 18, height: 18 }} />
      )}
    </button>
  );
}
