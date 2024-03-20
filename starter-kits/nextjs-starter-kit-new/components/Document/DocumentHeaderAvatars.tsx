import { useMemo } from "react";
import { useOthers, useSelf } from "../../liveblocks.config";
import { AvatarStack } from "../../primitives/AvatarStack";

export function DocumentHeaderAvatars() {
  const self = useSelf();
  const others = useOthers();
  const users = useMemo(
    () => (self ? [self, ...others] : others),
    [self, others]
  );

  return (
    <AvatarStack
      avatars={users.map((user) => ({
        name: user.info.name,
        src: user.info.avatar,
        color: user.info.color,
      }))}
      max={5}
      size={20}
      tooltip
      tooltipProps={{ sideOffset: 28 }}
    />
  );
}
