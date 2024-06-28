"use client";

import {
  useBroadcastEvent,
  useEventListener,
  useRoom,
} from "@liveblocks/react/suspense";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { getRoomTitle, setRoomTitle } from "../actions/liveblocks";

export function DocumentName() {
  const room = useRoom();
  const broadcast = useBroadcastEvent();
  const [title, setTitle] = useState("");

  useEffect(() => {
    getRoomTitle(room.id).then(setTitle);
  }, [room]);

  const handleChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    await setRoomTitle(room.id, e.target.value);
    broadcast({ type: "TITLE_UPDATE" });
  }, []);

  useEventListener(({ event }) => {
    if (event.type === "TITLE_UPDATE") {
      getRoomTitle(room.id).then(setTitle);
      return;
    }
  });

  return (
    <h1>
      <input type="text" value={title} onChange={handleChange} />
    </h1>
  );
}
