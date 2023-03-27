import styles from "./Header.module.css";
import { useOthers, useSelf } from "../liveblocks.config";
import Avatar from "./Avatar";
import Button from "./Button";
import SunIcon from "../icons/sun.svg";
import MoonIcon from "../icons/moon.svg";
import Tooltip from "./Tooltip";
import { Theme } from "../types";
import { useEffect, useState } from "react";
import { applyTheme } from "../utils";
import { LOCAL_STORAGE_THEME, USER_COLORS } from "../constants";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
  const others = useOthers();
  const self = useSelf();
  console.log(self);

  const hasMoreUsers = others.length > 3;
  const allUsers = [self, ...others];
  const { data: session } = useSession();

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
            {others.slice(0, 3).map((user) => {
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
            {hasMoreUsers && (
              <div className={styles.more}>
                <div className={styles.avatar_color}>+{others.length - 3}</div>
              </div>
            )}

            {self && (
              <div className={styles.you}>
                <Avatar
                  imageUrl={self.info.imageUrl}
                  key={self.connectionId}
                  color={USER_COLORS[self.connectionId % USER_COLORS.length]}
                  name="You"
                />
              </div>
            )}
          </div>
          <Button onClick={() => signOut()}> Sign Out</Button>
        </div>
      </div>
    </header>
  );
}

// {users.slice(0, 3).map(({ connectionId, info }) => {
//   return (
//     <Avatar
//       key={connectionId}
//       picture={info.picture}
//       name={info.name}
//     />
//   );
// })}

// {hasMoreUsers && <div className={styles.more}>+{users.length - 3}</div>}
