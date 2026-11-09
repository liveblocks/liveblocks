// A mock database with the support agents of the "Relay" workspace. In a real
// application these would come from your own user database.
const USER_INFO: Liveblocks["UserMeta"][] = [
  {
    id: "charlie.layne@relay.example",
    info: {
      name: "Charlie Layne",
      title: "Support lead",
      color: "#D583F0",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    id: "mislav.abha@relay.example",
    info: {
      name: "Mislav Abha",
      title: "Support engineer",
      color: "#F08385",
      avatar: "https://liveblocks.io/avatars/avatar-2.png",
    },
  },
  {
    id: "tatum.paolo@relay.example",
    info: {
      name: "Tatum Paolo",
      title: "Customer success",
      color: "#F0D885",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    id: "anjali.wanda@relay.example",
    info: {
      name: "Anjali Wanda",
      title: "Billing specialist",
      color: "#85EED6",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
  {
    id: "quinn.elton@relay.example",
    info: {
      name: "Quinn Elton",
      title: "Support engineer",
      color: "#87EE85",
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
