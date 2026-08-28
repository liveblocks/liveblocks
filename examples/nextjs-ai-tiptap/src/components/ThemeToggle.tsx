import { useState } from "react";
import { Button } from "@/primitives/Button";
import { MoonIcon, SunIcon } from "@/icons";
import styles from "./Toolbar.module.css";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  function changeTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    setTheme(newTheme);
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
