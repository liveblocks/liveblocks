export function getUserId(
  userIndex: number,
  roomId: string | null | undefined
) {
  const userId = `user-${userIndex}`;

  return roomId ? `${userId}-${roomId}` : userId;
}

export function getUserIndexFromUserId(userId: string) {
  const [, userIndex] = userId.match(/^user-(\d+)/) ?? [];

  return userIndex === undefined ? undefined : Number(userIndex);
}

export function getRoomIdFromUserId(userId: string): string | undefined {
  const [, , roomId] = userId.match(/^user-(\d+)-(.+)$/) ?? [];

  return roomId;
}
