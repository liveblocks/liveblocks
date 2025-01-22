// A mock database with example users
const USER_INFO: Liveblocks["UserMeta"][] = [
  {
    // TODO: Revert to email
    id: "nyWnem",
    info: {
      name: "Charlie Layne",
      color: "#D583F0",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    // TODO: Revert to email
    id: "91TRgi",
    info: {
      name: "Mislav Abha",
      color: "#F08385",
      avatar: "https://liveblocks.io/avatars/avatar-2.png",
    },
  },
  {
    // TODO: Revert to email
    id: "1ltG8B",
    info: {
      name: "Tatum Paolo",
      color: "#F0D885",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    // TODO: Revert to email
    id: "7L2rVt",
    info: {
      name: "Anjali Wanda",
      color: "#85EED6",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
  {
    // TODO: Revert to email
    id: "O4pheE",
    info: {
      name: "Jody Hekla",
      color: "#85BBF0",
      avatar: "https://liveblocks.io/avatars/avatar-5.png",
    },
  },
  {
    // TODO: Revert to email
    id: "T7jObe",
    info: {
      name: "Emil Joyce",
      color: "#8594F0",
      avatar: "https://liveblocks.io/avatars/avatar-6.png",
    },
  },
  {
    // TODO: Revert to email
    id: "Pr1eY8",
    info: {
      name: "Jory Quispe",
      color: "#85DBF0",
      avatar: "https://liveblocks.io/avatars/avatar-7.png",
    },
  },
  {
    // TODO: Revert to email
    id: "YRK05s",
    info: {
      name: "Quinn Elton",
      color: "#87EE85",
      avatar: "https://liveblocks.io/avatars/avatar-8.png",
    },
  },
];

export function getRandomUser() {
  return USER_INFO[Math.floor(Math.random() * 10) % USER_INFO.length];
}

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || undefined;
}

export async function getUsers(ids: string[]) {
  return ids.map((id) => getUser(id));
}

export function getAllUsers() {
  return USER_INFO;
}
