import { Avatar } from "./Avatar";
import { useOthersConnectionIds, useSelf } from "../liveblocks.real.config";

export default function Avatars() {
  const others: number[] = useOthersConnectionIds();
  const currentUser = useSelf();

  return (
    <div className="avatars">
      {others.reverse().map((id) => (
        <Avatar
          key={id}
          avatar={`https://liveblocks.io/avatars/avatar-${Math.floor(
            id % 30
          )}.png`}
        />
      ))}

      {currentUser ? (
        <Avatar
          key="you"
          avatar={`https://liveblocks.io/avatars/avatar-${Math.floor(
            currentUser.connectionId % 30
          )}.png`}
        />
      ) : null}
    </div>
  );
}
