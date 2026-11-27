// A mock database with example users. Colors are used for each user's
// playhead, cursor and selections, so they're saturated enough to read on
// white and on video.
const USER_INFO: Liveblocks["UserMeta"][] = [
  {
    id: "charlie.layne@example.com",
    info: {
      name: "Charlie Layne",
      color: "#E5484D",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    id: "mislav.abha@example.com",
    info: {
      name: "Mislav Abha",
      color: "#F76B15",
      avatar: "https://liveblocks.io/avatars/avatar-2.png",
    },
  },
  {
    id: "tatum.paolo@example.com",
    info: {
      name: "Tatum Paolo",
      color: "#30A46C",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    id: "anjali.wanda@example.com",
    info: {
      name: "Anjali Wanda",
      color: "#0090FF",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
  {
    id: "jody.hekla@example.com",
    info: {
      name: "Jody Hekla",
      color: "#D6409F",
      avatar: "https://liveblocks.io/avatars/avatar-5.png",
    },
  },
  {
    id: "emil.joyce@example.com",
    info: {
      name: "Emil Joyce",
      color: "#12A594",
      avatar: "https://liveblocks.io/avatars/avatar-6.png",
    },
  },
  {
    id: "quinn.elton@example.com",
    info: {
      name: "Quinn Elton",
      color: "#8E4EC6",
      avatar: "https://liveblocks.io/avatars/avatar-8.png",
    },
  },
];

export function getRandomUser() {
  return USER_INFO[Math.floor(Math.random() * USER_INFO.length)];
}

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || undefined;
}

export function getUsers() {
  return USER_INFO;
}
