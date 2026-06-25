import { EXTERNAL_USER_TYPE, INTERNAL_USER_TYPE, type UserType } from "@/user";

type ExampleUser = Liveblocks["UserMeta"] & {
  type: UserType;
};

const USER_INFO: ExampleUser[] = [
  {
    id: "charlie.layne@example.com",
    type: INTERNAL_USER_TYPE,
    info: {
      name: "Charlie Layne",
      color: "#D583F0",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    id: "mislav.abha@example.com",
    type: INTERNAL_USER_TYPE,
    info: {
      name: "Mislav Abha",
      color: "#F08385",
      avatar: "https://liveblocks.io/avatars/avatar-2.png",
    },
  },
  {
    id: "tatum.paolo@example.com",
    type: INTERNAL_USER_TYPE,
    info: {
      name: "Tatum Paolo",
      color: "#F0D885",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    id: "anjali.wanda@example.com",
    type: INTERNAL_USER_TYPE,
    info: {
      name: "Anjali Wanda",
      color: "#85EED6",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
  {
    id: "jody.hekla@example.com",
    type: EXTERNAL_USER_TYPE,
    info: {
      name: "Jody Hekla",
      color: "#85BBF0",
      avatar: "https://liveblocks.io/avatars/avatar-5.png",
    },
  },
  {
    id: "emil.joyce@example.com",
    type: EXTERNAL_USER_TYPE,
    info: {
      name: "Emil Joyce",
      color: "#8594F0",
      avatar: "https://liveblocks.io/avatars/avatar-6.png",
    },
  },
  {
    id: "jory.quispe@example.com",
    type: EXTERNAL_USER_TYPE,
    info: {
      name: "Jory Quispe",
      color: "#85DBF0",
      avatar: "https://liveblocks.io/avatars/avatar-7.png",
    },
  },
  {
    id: "quinn.elton@example.com",
    type: EXTERNAL_USER_TYPE,
    info: {
      name: "Quinn Elton",
      color: "#87EE85",
      avatar: "https://liveblocks.io/avatars/avatar-8.png",
    },
  },
];

export function getRandomUser(type: UserType) {
  const users = USER_INFO.filter((user) => user.type === type);
  return users[Math.floor(Math.random() * users.length)];
}

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || null;
}

export function getUsers() {
  return USER_INFO;
}
