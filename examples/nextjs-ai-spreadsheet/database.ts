export const AI_USER_ID = "ai-assistant";
export const AI_USER_NAME = "Liveblocks AI";
export const AI_USER_COLOR = "#b282fa";
export const AI_USER_AVATAR =
  "https://liveblocks.io/api/avatar?u=ai-assistant&agent=true";

// A mock database with example users.
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
    id: "jody.hekla@example.com",
    info: {
      name: "Jody Hekla",
      color: "#85BBF0",
      avatar: "https://liveblocks.io/avatars/avatar-5.png",
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
  // The AI assistant. Shown in the AvatarStack and on cells it is editing,
  // via `setPresence` from the server.
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
  return USER_INFO.find((u) => u.id === id) || undefined;
}

export function getUsers() {
  return USER_INFO;
}
