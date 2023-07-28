import { useOthers, useSelf } from "@/liveblocks.config";
import styles from "./Avatars.module.css";

export function Avatars() {
  const users = useOthers();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > 3;

  return (
    <div className={styles.avatars}>
      {users.slice(0, 3).map(({ connectionId, info }) => {
        return (
          <Avatar
            key={connectionId}
            picture={`https://liveblocks.io/avatars/avatar-${
              connectionId % 30
            }.png`}
          />
        );
      })}

      {hasMoreUsers && <div className={styles.more}>+{users.length - 3}</div>}

      {currentUser && (
        <div className="relative ml-8 first:ml-0">
          <Avatar
            picture={`https://liveblocks.io/avatars/avatar-${
              currentUser.connectionId % 30
            }.png`}
          />
        </div>
      )}
    </div>
  );
}

export function Avatar({ picture }: { picture: string }) {
  return (
    <div className={styles.avatar}>
      <img src={picture} className={styles.avatar_picture} />
    </div>
  );
}
