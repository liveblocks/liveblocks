import { useState } from "react";
import { Button } from "@/components/Button";
import { MoonIcon, SunIcon } from "@/icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  function changeTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    setTheme(isDark ? "dark" : "light");
  }

  return (
    <Button
      className="!p-2"
      variant="subtle"
      onClick={changeTheme}
      aria-label="Switch Theme"
    >
      {theme === "dark" ? (
        <SunIcon style={{ width: 18, height: 18 }} />
      ) : (
        <MoonIcon style={{ width: 18, height: 18 }} />
      )}
    </Button>
  );
}
