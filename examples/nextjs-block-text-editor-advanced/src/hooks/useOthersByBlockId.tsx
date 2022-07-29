import { User } from "@liveblocks/client";
import { useOthers } from "../liveblocks.config";
import { Presence, UserMeta } from "../types";

export default function useOthersByBlockId(blockId: string) {
  const others = useOthers();

  const othersByBlockId: User<Presence, UserMeta>[] = [];

  for (let i = 0; i < others.toArray().length; i++) {
    const other = others.toArray()[i];
    if (other.presence?.selectedBlockIds.find((id) => id === blockId)) {
      othersByBlockId.push(other);
    }
  }

  return othersByBlockId;
}
