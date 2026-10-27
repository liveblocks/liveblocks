import { RoomData } from "@liveblocks/node";
import { useEffect, useState } from "react";

const path = (path: string) => `/api/rooms/${encodeURIComponent(path)}`;

export function useManageRoom(roomId?: string) {
  const [room, setRoom] = useState<RoomData | null>(null);

  useEffect(() => {
    if (!room && roomId) {
      getRoom(roomId).then(setRoom);
    }
  }, [room, roomId]);

  const createRoom = async ({
    tenantId,
    roomId,
    isPrivate,
    userId,
  }: {
    roomId: string;
    isPrivate: boolean;
    tenantId: string;
    userId?: string;
  }) => {
    const response = await fetch(path(roomId), {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        userId,
        isPrivate,
      }),
    });
    const data = await response.json();
    setRoom(data);
    return data;
  };

  const getRoom = async (roomId: string) => {
    const response = await fetch(path(roomId));
    const data = await response.json();
    setRoom(data);
    return data;
  };

  const inviteUser = async ({
    tenantId,
    roomId,
    userId,
  }: {
    tenantId: string;
    roomId: string;
    userId: string;
  }) => {
    const response = await fetch(path(`${roomId}/invite-user`), {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        userId,
      }),
    });

    const data = await response.json();
    setRoom(data);
    return data;
  };

  const removeUser = async ({
    roomId,
    userId,
    tenantId,
  }: {
    tenantId: string;
    roomId: string;
    userId: string;
  }) => {
    const response = await fetch(path(`${roomId}/remove-user`), {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        userId,
      }),
    });

    const data = await response.json();
    setRoom(data);
    return data;
  };

  const togglePrivate = async ({
    tenantId,
    roomId,
    isPrivate,
  }: {
    tenantId: string;
    roomId: string;
    isPrivate: boolean;
  }) => {
    const response = await fetch(path(`${roomId}/toggle-private`), {
      method: "POST",
      body: JSON.stringify({
        isPrivate,
        tenantId,
      }),
    });

    const data = await response.json();
    setRoom(data);
    return data;
  };

  return { createRoom, getRoom, inviteUser, removeUser, togglePrivate, room };
}
