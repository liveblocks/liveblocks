import styles from "./Header.module.css";
import { useOthers } from "../liveblocks.config";
import Avatar from "./Avatar";
import Button from "./Button";
import SunIcon from "../icons/sun.svg";
import MoonIcon from "../icons/moon.svg";
import Tooltip from "./Tooltip";
import { Theme } from "../types";
import { useEffect, useState } from "react";
import { applyTheme } from "../utils";
import { LOCAL_STORAGE_THEME, USER_COLORS } from "../constants";

export default function Header() {
  const others = useOthers();

  const [theme, setTheme] = useState<Theme | null>(
    localStorage.getItem(LOCAL_STORAGE_THEME) as Theme | null
  );

  useEffect(() => {
    if (!theme) {
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_THEME, theme);
    applyTheme(theme);
  }, [theme]);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Tooltip content="Switch Theme">
            <Button
              appearance="ghost"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              ariaLabel="Switch Theme"
              isSquare
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </Button>
          </Tooltip>
        </div>
        <div className={styles.right}>
          <div className={styles.avatars}>
            {others.map((user) => {
              const {
                info: { imageUrl, name },
                connectionId,
              } = user;
              return (
                <Avatar
                  key={connectionId}
                  imageUrl={imageUrl}
                  name={name}
                  color={USER_COLORS[connectionId % USER_COLORS.length]}
                />
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
