import type * as RadixSelect from "@radix-ui/react-select";
import type { ComponentProps } from "react";
import { useCallback } from "react";

import {
  useCurrentRoomId,
  useRoomIds,
  useSetCurrentRoomId,
} from "../contexts/CurrentRoom";
import { Select } from "./Select";

export function RoomSelector(
  props: Omit<
    ComponentProps<typeof RadixSelect.Trigger>,
    "value" | "defaultValue"
  >
) {
  const currentRoomId = useCurrentRoomId();
  const setCurrentRoomId = useSetCurrentRoomId();

  const roomIds = useRoomIds();

  const handleValueChange = useCallback(
    (value: string) => {
      setCurrentRoomId(value);
    },
    [setCurrentRoomId]
  );

  return (
    <Select
      description="Choose a room"
      onValueChange={handleValueChange}
      value={currentRoomId ?? undefined}
      items={roomIds.map((roomId) => ({ value: roomId }))}
      {...props}
    />
  );
}
