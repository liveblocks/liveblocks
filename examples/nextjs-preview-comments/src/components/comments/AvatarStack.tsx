import { useOthers, useSelf } from "@/liveblocks.config";
import { Avatar } from "./Avatar";

export function AvatarStack() {
  const users = useOthers();
  const currentUser = useSelf();

  return (
    <div style={{ display: "flex", gap: "var(--space-3)" }}>
      {currentUser && (
        <div>
          <Avatar
            src={currentUser.info.avatar}
            name={currentUser.info.name}
            size={42}
            borderSize={4}
          />
        </div>
      )}

      {users.map(({ connectionId, info }) => {
        return (
          <Avatar
            key={connectionId}
            src={info.avatar}
            name={info.name}
            size={42}
            borderSize={4}
            style={{
              marginLeft: "calc(1px - var(--space-8)",
            }}
          />
        );
      })}
    </div>
  );
}
