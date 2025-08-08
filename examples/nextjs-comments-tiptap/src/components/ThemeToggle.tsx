"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { MoonIcon, SunIcon } from "@/icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  function changeTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    setTheme(newTheme);
  }

  return (
    <Button
      className="w-10 h-10 p-0 flex items-center justify-center"
      variant="subtle"
      onClick={changeTheme}
      aria-label="Switch Theme"
    >
      {theme === "dark" ? (
        <SunIcon style={{ width: "18px" }} />
      ) : (
        <MoonIcon style={{ width: "18px" }} />
      )}
    </Button>
  );
}
