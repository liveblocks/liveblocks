import { capitalize, createExampleRoomId } from "./example";

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
];

const ROOMS: Liveblocks["RoomInfo"][] = [
  "general",
  "engineering",
  "design",
].map((room) => ({
  id: createExampleRoomId(room),
  slug: room,
  name: capitalize(room),
  url: `/${room}`,
}));

// Simulate getting a user from a database.
export async function getUser(id: string) {
  const user = USERS.find((user) => user.id === id || id.startsWith(user.id));
  if (!user) return;
  return {
    ...user,
    id, // Don't change the requested ID
  };
}

// Simulate getting a list of users from a database.
export async function getUsers() {
  return USERS;
}

// Simulate getting a room from a database.
export async function getRoom(id: string) {
  return ROOMS.find((room) => room.id === id || id.startsWith(room.id));
}

// Simulate getting a list of rooms from a database.
export async function getRooms() {
  return ROOMS;
}
