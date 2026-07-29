export const AI_USER_ID = "ai-assistant";
export const AI_USER_NAME = "Liveblocks AI";
export const AI_USER_COLOR = "#000000";
export const AI_USER_AVATAR =
  "https://liveblocks.io/api/avatar?u=ai-assistant&agent=true";

export function createAgentEditUserId() {
  return `${AI_USER_ID}:${crypto.randomUUID()}`;
}

export function isAiUserId(id: string) {
  return id === AI_USER_ID || id.startsWith(`${AI_USER_ID}:`);
}

// A mock database with example users
const USER_INFO: Liveblocks["UserMeta"][] = [
  {
    id: "charlie.layne@example.com",
    info: {
      name: "Charlie Layne",
      color: "#D583F0",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    id: "mislav.abha@example.com",
    info: {
      name: "Mislav Abha",
      color: "#F08385",
      avatar: "https://liveblocks.io/avatars/avatar-2.png",
    },
  },
  {
    id: "tatum.paolo@example.com",
    info: {
      name: "Tatum Paolo",
      color: "#F0D885",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    id: "anjali.wanda@example.com",
    info: {
      name: "Anjali Wanda",
      color: "#85EED6",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
  {
    id: "quinn.elton@example.com",
    info: {
      name: "Quinn Elton",
      color: "#87EE85",
      avatar: "https://liveblocks.io/avatars/avatar-8.png",
    },
  },
  {
    id: AI_USER_ID,
    info: {
      name: AI_USER_NAME,
      color: AI_USER_COLOR,
      avatar: AI_USER_AVATAR,
    },
  },
];

export function getRandomUser() {
  const humans = USER_INFO.filter((user) => user.id !== AI_USER_ID);
  return humans[Math.floor(Math.random() * humans.length)];
}

export function getUser(id: string) {
  if (isAiUserId(id)) {
    return USER_INFO.find((u) => u.id === AI_USER_ID);
  }
  return USER_INFO.find((u) => u.id === id) || undefined;
}

export function getUsers() {
  return USER_INFO;
}
