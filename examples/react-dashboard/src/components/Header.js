import { useOthers } from "@liveblocks/react";
import Avatar from "./Avatar";
import { COLORS_PRESENCE } from "../constants";
import styles from "./Header.module.css";

export default function Header() {
  const others = useOthers();

  return (
    <header className={styles.container}>
      <h1>Dashboard</h1>
      <div className={styles.container_avatars}>
        {others.map(({ connectionId }) => {
          if (!connectionId) {
            return null;
          }

          return (
            <Avatar
              key={connectionId}
              color={COLORS_PRESENCE[connectionId % COLORS_PRESENCE.length]}
            />
          );
        })}
      </div>
    </header>
  );
}
