export const BOT_USER_ID = "__bot__";
export const BOT_USER_NAME = "Liveblocks Bot";

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
    id: BOT_USER_ID,
    info: {
      name: BOT_USER_NAME,
      color: "#000000",
      avatar: "/bot-avatar.png",
    },
  },
];

export function getRandomUser() {
  return USER_INFO.filter((user) => user.id !== BOT_USER_ID)[
    Math.floor(Math.random() * 10) % USER_INFO.length
  ];
}

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || undefined;
}

export function getUsers() {
  return USER_INFO;
}
