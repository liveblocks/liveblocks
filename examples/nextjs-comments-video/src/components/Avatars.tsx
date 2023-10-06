import { useOthers, useSelf } from "@/liveblocks.config";
import styles from "./Avatars.module.css";

export function Avatars() {
  const users = useOthers();
  const currentUser = useSelf();

  return (
    <div className={styles.avatars}>
      {users.map(({ connectionId, info }) => {
        return <Avatar key={connectionId} src={info.avatar} name={info.name} />;
      })}

      {currentUser && (
        <div className="relative ml-8 first:ml-0">
          <Avatar src={currentUser.info.avatar} name={currentUser.info.name} />
        </div>
      )}
    </div>
  );
}

export function Avatar({ src, name }: { src: string; name: string }) {
  return (
    <div className={styles.avatar} data-tooltip={name}>
      <img src={src} className={styles.avatar_picture} data-tooltip={name} />
    </div>
  );
}
