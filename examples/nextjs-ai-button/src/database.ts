const USERS: Liveblocks["UserMeta"][] = [
  {
    id: "user-0",
    info: {
      name: "Charlie Layne",
      avatar: "https://liveblocks.io/avatars/avatar-0.png",
    },
  },
  {
    id: "user-1",
    info: {
      name: "Mislav Abha",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    id: "user-2",
    info: {
      name: "Tatum Paolo",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    id: "user-3",
    info: {
      name: "Anjali Wanda",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
];

// Simulate getting a list of users from a database.
export async function getUsers() {
  return USERS;
}
