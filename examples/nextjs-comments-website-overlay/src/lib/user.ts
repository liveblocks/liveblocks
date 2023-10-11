const USER_INFO = [
  {
    id: "charlie-layne@example.com",
    info: {
      name: "Jim Laurie",
      color: "#D583F0",
      avatar: "/people/jim.png",
    },
  },
  {
    id: "mislav-abha@example.com",
    info: {
      name: "Steven Fabre",
      color: "#F08385",
      avatar: "/people/steven.png",
    },
  },
  {
    id: "anjali-wanda@example.com",
    info: {
      name: "Chris Nicholas",
      color: "#85EED6",
      avatar: "/people/chris.png",
    },
  },
  {
    id: "jody-hekla@example.com",
    info: {
      name: "Alexandre Bodin",
      color: "#85BBF0",
      avatar: "/people/alexandre.png",
    },
  },
  {
    id: "emil-joyce@example.com",
    info: {
      name: "Pierre Burgy",
      color: "#8594F0",
      avatar: "/people/pierre.png",
    },
  },
  {
    id: "jory-quispe@example.com",
    info: {
      name: "Aurélien Georget",
      color: "#85DBF0",
      avatar: "/people/aurelien.png",
    },
  },
  {
    id: "quinn-elton@example.com",
    info: {
      name: "Adrien Gaudon",
      color: "#87EE85",
      avatar: "/people/adrien.png",
    },
  },
];

export function getRandomUser() {
  return USER_INFO[Math.floor(Math.random() * 10) % USER_INFO.length];
}

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || null;
}

export function getUsers() {
  return USER_INFO;
}
