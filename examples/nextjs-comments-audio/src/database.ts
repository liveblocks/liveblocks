import { UserMeta } from "@/liveblocks.config";

const USER_INFO: UserMeta[] = [
  {
    id: "charlie.layne@example.com",
    info: {
      name: "Adrien Gaudon",
      color: "#D583F0",
      avatar:
        "https://liveblocks.io/_next/image?url=%2Fimages%2Fpeople%2Fadrien-gaudon.jpg&w=64&q=75",
    },
  },
  {
    id: "mislav.abha@example.com",
    info: {
      name: "Alicia Henríquez",
      color: "#F08385",
      avatar:
        "https://liveblocks.io/_next/image?url=%2Fimages%2Fpeople%2Falicia-henriquez.jpg&w=64&q=75",
    },
  },
  {
    id: "tatum-paolo@example.com",
    info: {
      name: "Chris Nicholas",
      color: "#F0D885",
      avatar:
        "https://liveblocks.io/_next/image?url=%2Fimages%2Fpeople%2Fchris-nicholas.jpg&w=64&q=75",
    },
  },
  {
    id: "anjali-wanda@example.com",
    info: {
      name: "Florent Lefebvre",
      color: "#85EED6",
      avatar:
        "https://liveblocks.io/_next/image?url=%2Fimages%2Fpeople%2Fflorent-lefebvre.jpg&w=64&q=75",
    },
  },
  {
    id: "jody-hekla@example.com",
    info: {
      name: "Guillaume Salles",
      color: "#85BBF0",
      avatar:
        "https://liveblocks.io/_next/image?url=%2Fimages%2Fpeople%2Fguillaume-salles.jpg&w=64&q=75",
    },
  },
  {
    id: "emil-joyce@example.com",
    info: {
      name: "Olivier Foucherot",
      color: "#8594F0",
      avatar:
        "https://liveblocks.io/_next/image?url=%2Fimages%2Fpeople%2Folivier-foucherot.jpg&w=64&q=75",
    },
  },
  {
    id: "jory-quispe@example.com",
    info: {
      name: "Jonathan Rowny",
      color: "#85DBF0",
      avatar:
        "https://liveblocks.io/_next/image?url=%2Fimages%2Fpeople%2Fjonathan-rowny.jpg&w=64&q=75",
    },
  },
  {
    id: "quinn-elton@example.com",
    info: {
      name: "Steven Fabre",
      color: "#87EE85",
      avatar:
        "https://liveblocks.io/_next/image?url=%2Fimages%2Fpeople%2Fsteven-fabre.jpg&w=64&q=75",
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
