import { nanoid } from "nanoid";

const AI_AGENT_ID_PREFIX = "#agent";

export function isAgentUserId(userId: string): boolean {
  return userId.startsWith(AI_AGENT_ID_PREFIX);
}

export function getAgentUserInfo(
  userId: string
): Liveblocks["UserMeta"]["info"] {
  return {
    name: "AI Agent",
    color: "#555",
    avatar: `https://liveblocks.io/api/avatar?u=${encodeURIComponent(userId)}&agent=true`,
  };
}

export function createAgentUser(): Liveblocks["UserMeta"] {
  const id = `${AI_AGENT_ID_PREFIX}${nanoid(10)}`;

  return { id, info: getAgentUserInfo(id) };
}

export const USERS: Liveblocks["UserMeta"][] = [
  {
    id: "user-0",
    info: {
      name: "Charlie Layne",
      color: "#D583F0",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    id: "user-1",
    info: {
      name: "Mislav Abha",
      color: "#F08385",
      avatar: "https://liveblocks.io/avatars/avatar-2.png",
    },
  },
  {
    id: "user-2",
    info: {
      name: "Tatum Paolo",
      color: "#F0D885",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    id: "user-3",
    info: {
      name: "Anjali Wanda",
      color: "#85EED6",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
  {
    id: "user-4",
    info: {
      name: "Jody Hekla",
      color: "#85BBF0",
      avatar: "https://liveblocks.io/avatars/avatar-5.png",
    },
  },
  {
    id: "user-5",
    info: {
      name: "Emil Joyce",
      color: "#8594F0",
      avatar: "https://liveblocks.io/avatars/avatar-6.png",
    },
  },
  {
    id: "user-6",
    info: {
      name: "Jory Quispe",
      color: "#85DBF0",
      avatar: "https://liveblocks.io/avatars/avatar-7.png",
    },
  },
  {
    id: "user-7",
    info: {
      name: "Quinn Elton",
      color: "#87EE85",
      avatar: "https://liveblocks.io/avatars/avatar-8.png",
    },
  },
];
