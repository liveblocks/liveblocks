import { UserMeta, RoomInfo } from "./liveblocks.config";

const ROOMS: { id: string; info: RoomInfo }[] = [
  {
    id: "my-org:my-team:room-1",
    info: {
      title: "New document",
      description:
        "To ready ourselves for our next marketing push, we need to coordinate our efforts…",
    },
  },
  {
    id: "my-org:my-team:room-2",
    info: {
      title: "A second document",
      description: "We should consider whether it’s possible to…",
    },
  },
];

export function getRoom(id: string) {
  return ROOMS.find((u) => u.id === id) || null;
}

export const USER_INFO: UserMeta[] = [
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
    id: "emil.joyce@example.com",
    info: {
      name: "Emil Joyce",
      color: "#8594F0",
      avatar: "https://liveblocks.io/avatars/avatar-6.png",
    },
  },
  {
    id: "jory.quispe@example.com",
    info: {
      name: "Jory Quispe",
      color: "#85DBF0",
      avatar: "https://liveblocks.io/avatars/avatar-7.png",
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
];

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || null;
}

export function getRandomStatus() {
  const statuses = ["To Do", "In Progress", "In Review", "Done"];
  return statuses[Math.floor(Math.random() * statuses.length)];
}
