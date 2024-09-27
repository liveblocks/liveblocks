import { LiveObject } from "@liveblocks/client";
import { useRoom } from "@liveblocks/react";
import { RenderCallback, useFrame } from "@react-three/fiber";

export function useStorageFrame(
  callback: (
    storage: LiveObject<Liveblocks["Storage"]>,
    ...args: Parameters<RenderCallback>
  ) => void
) {
  const room = useRoom();

  useFrame((...args) => {
    const storage = room.getStorageSnapshot();

    if (!storage) {
      return;
    }

    callback(storage, ...args);
  });
}
