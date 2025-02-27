import { RoomData } from "@liveblocks/node";

export function useManageRoom() {
  const createRoom = async (
    roomId: string,
    isPrivate: boolean,
    tenantId: string,
    userId: string
  ) => {
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        userId,
        isPrivate,
      }),
    });

    return response.json() as Promise<RoomData>;
  };

  const getRoom = async (roomId: string) => {
    const response = await fetch(`/api/rooms/${roomId}`);
    return response.json() as Promise<RoomData>;
  };

  const inviteUser = async (
    roomId: string,
    userId: string,
    tenantId: string
  ) => {
    const response = await fetch(`/api/rooms/${roomId}/invite-user`, {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        userId,
      }),
    });

    return response.json() as Promise<RoomData>;
  };

  const removeUser = async (
    roomId: string,
    userId: string,
    tenantId: string
  ) => {
    const response = await fetch(`/api/rooms/${roomId}/remove-user`, {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        userId,
      }),
    });

    return response.json() as Promise<RoomData>;
  };

  const togglePrivate = async (
    roomId: string,
    isPrivate: boolean,
    tenantId: string
  ) => {
    const response = await fetch(`/api/rooms/${roomId}/toggle-private`, {
      method: "POST",
      body: JSON.stringify({
        isPrivate,
        tenantId,
      }),
    });

    return response.json() as Promise<RoomData>;
  };

  return { createRoom, getRoom, inviteUser, removeUser, togglePrivate };
}
