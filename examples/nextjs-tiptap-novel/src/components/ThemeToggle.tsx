import { useState } from "react";
import { Button } from "@/primitives/Button";
import { MoonIcon, SunIcon } from "@/icons";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  function changeTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    setTheme(isDark ? "dark" : "light");
  }

  return (
    <Button
      className={styles.toolbarButton}
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
