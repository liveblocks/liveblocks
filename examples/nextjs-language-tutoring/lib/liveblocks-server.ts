import {
  Liveblocks,
  LiveblocksError,
  LiveMap,
  LiveObject,
  type RoomData,
} from "@liveblocks/node";
import { nanoid } from "nanoid";
import { getUser, getUsers } from "@/app/database";
import {
  getDirectoryRoomId,
  getRoomScope,
  isExampleRoomId,
} from "./example";
import type { SessionUser } from "./auth";
import type { RoomInfo, UserInfo, UserMeta } from "@/liveblocks.config";

export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // Only set when running against the local Liveblocks dev server
  baseUrl: process.env.LIVEBLOCKS_BASE_URL,
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export type RoomMember = {
  id: string;
  info: UserInfo | null;
  role: "tutor" | "student";
};

export type LessonRoom = {
  id: string;
  language: string;
  ownerId: string;
  createdAt: string;
  lastConnectionAt: string | null;
  members: RoomMember[];
};

export const INVITE_TOKEN_KEY = "inviteToken";

export function createRoomId(exampleId: string | null) {
  return `${getRoomScope(exampleId)}:${nanoid(10)}`;
}

export function getRoomMemberIds(room: RoomData) {
  return Object.entries(room.usersAccesses)
    .filter(([, access]) => access && access.length > 0)
    .map(([userId]) => userId);
}

export function isRoomMember(room: RoomData, userId: string) {
  return getRoomMemberIds(room).includes(userId);
}

export function getRoomInfo(room: RoomData): RoomInfo {
  const { language, ownerId } = room.metadata;
  return {
    language: typeof language === "string" ? language : "en",
    ownerId: typeof ownerId === "string" ? ownerId : "",
  };
}

export async function getLessonRoom(roomId: string, userId: string) {
  if (!isExampleRoomId(roomId)) {
    return undefined;
  }
  let room: RoomData;
  try {
    room = await liveblocks.getRoom(roomId);
  } catch (error) {
    if (error instanceof LiveblocksError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
  if (!isRoomMember(room, userId)) {
    return undefined;
  }
  return room;
}

export async function toLessonRooms(
  rooms: RoomData[],
  exampleId: string | null
): Promise<LessonRoom[]> {
  const memberIds = new Set(rooms.flatMap(getRoomMemberIds));
  const profiles = await resolveUserInfos([...memberIds], exampleId);

  return rooms.map((room) => {
    const info = getRoomInfo(room);
    return {
      id: room.id,
      ...info,
      createdAt: room.createdAt.toISOString(),
      lastConnectionAt: room.lastConnectionAt?.toISOString() ?? null,
      members: getRoomMemberIds(room).map((id) => ({
        id,
        info: profiles.get(id) ?? null,
        role: id === info.ownerId ? "tutor" : "student",
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// User directory
//
// Google users aren't in `app/database.ts`, so their profile (name, avatar,
// color) is stored in a dedicated Liveblocks room's Storage, keyed by user
// id. `/api/users` reads it when resolving users for avatars and mentions.
// ---------------------------------------------------------------------------

type Profile = UserInfo;

export async function upsertProfile(
  user: SessionUser,
  exampleId: string | null
) {
  if (!user.external) {
    return;
  }
  const roomId = getDirectoryRoomId(exampleId);
  await ensureRoom(roomId);
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    let profiles = root.get("profiles");
    if (!profiles) {
      profiles = new LiveMap();
      root.set("profiles", profiles);
    }
    const existing = profiles.get(user.id)?.toJSON();
    if (
      !existing ||
      existing.name !== user.info.name ||
      existing.avatar !== user.info.avatar
    ) {
      profiles.set(user.id, new LiveObject({ ...user.info }));
    }
  });
}

export async function resolveUserInfos(
  userIds: string[],
  exampleId: string | null
): Promise<Map<string, Profile>> {
  const result = new Map<string, Profile>();
  const unknown: string[] = [];

  for (const id of userIds) {
    const demoUser = getUser(id);
    if (demoUser) {
      result.set(id, demoUser.info);
    } else {
      unknown.push(id);
    }
  }

  if (unknown.length > 0) {
    const directory = await readDirectory(exampleId);
    for (const id of unknown) {
      const profile = directory.get(id);
      if (profile) {
        result.set(id, profile);
      }
    }
  }

  return result;
}

export async function searchUsers(text: string, exampleId: string | null) {
  const query = text.trim().toLowerCase();
  const directory = await readDirectory(exampleId);
  const everyone: UserMeta[] = [
    ...getUsers(),
    ...[...directory.entries()].map(([id, info]) => ({ id, info })),
  ];
  return everyone
    .filter(
      (user) =>
        !query ||
        user.info.name.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
    )
    .map((user) => user.id);
}

async function readDirectory(
  exampleId: string | null
): Promise<Map<string, Profile>> {
  const roomId = getDirectoryRoomId(exampleId);
  try {
    const document = await liveblocks.getStorageDocument(roomId, "json");
    const profiles = (document as { profiles?: Record<string, Profile> })
      .profiles;
    return new Map(Object.entries(profiles ?? {}));
  } catch (error) {
    if (error instanceof LiveblocksError && error.status === 404) {
      return new Map();
    }
    throw error;
  }
}

async function ensureRoom(roomId: string) {
  try {
    await liveblocks.getRoom(roomId);
  } catch (error) {
    if (error instanceof LiveblocksError && error.status === 404) {
      await liveblocks.createRoom(
        roomId,
        { defaultAccesses: [] },
        { idempotent: true }
      );
      return;
    }
    throw error;
  }
}
