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

const TENANTS: { id: string; name: string }[] = [
  {
    id: "acme",
    name: "Acme",
  },
  {
    id: "lumon",
    name: "Lumon",
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
  return USERS.find((user) => user.id === id || id.startsWith(user.id));
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

// Simulate getting a tenant from a database.
export async function getTenant(id: string) {
  return TENANTS.find((tenant) => tenant.id === id || id.startsWith(tenant.id));
}

// Simulate getting a list of tenants from a database.
export async function getTenants() {
  return TENANTS;
}
