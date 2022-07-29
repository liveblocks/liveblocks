import styles from "../../styles/Header.module.css";
import { useHistory, useOthers } from "../liveblocks.config";
import Avatar from "./Avatar";
import Button from "./Button";
import UndoIcon from "../icons/undo.svg";
import RedoIcon from "../icons/redo.svg";
import SunIcon from "../icons/sun.svg";
import MoonIcon from "../icons/moon.svg";
import Tooltip from "./Tooltip";
import { Theme } from "../types";
import { useEffect, useState } from "react";
import applyTheme from "../utils/applyTheme";
import { LOCAL_STORAGE_THEME, USER_COLORS } from "../constants";

export default function Header() {
  const others = useOthers();
  const history = useHistory();

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
          <div className={styles.group}>
            <Tooltip content="Undo">
              <Button
                type="ghost"
                onClick={() => history.undo()}
                ariaLabel="Undo"
              >
                <UndoIcon />
              </Button>
            </Tooltip>
            <Tooltip content="Redo">
              <Button
                type="ghost"
                onClick={() => history.redo()}
                ariaLabel="Redo"
              >
                <RedoIcon />
              </Button>
            </Tooltip>
          </div>
          <div className={styles.separator} />
          <div className={styles.group}>
            <Tooltip content="Switch Theme">
              <Button
                type="ghost"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                ariaLabel="Switch Theme"
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </Button>
            </Tooltip>
          </div>
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
