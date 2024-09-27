import { User } from "@liveblocks/client";
import { useRoom } from "@liveblocks/react";
import { RenderCallback, useFrame } from "@react-three/fiber";

export function useOtherFrame(
  connectionId: number,
  callback: (
    other: User<Liveblocks["Presence"], Liveblocks["UserMeta"]>,
    ...args: Parameters<RenderCallback>
  ) => void
) {
  const room = useRoom();

  useFrame((...args) => {
    const other = room
      .getOthers()
      .find((other) => other.connectionId === connectionId);

    if (!other) {
      return;
    }

    callback(other, ...args);
  });
}
