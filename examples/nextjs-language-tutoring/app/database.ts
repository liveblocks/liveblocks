// A hardcoded directory of demo users, used when Google sign-in isn't
// configured (and for the liveblocks.io gallery previews). Google users are
// not in this list: their profiles are stored in a Liveblocks "directory"
// room instead, see `lib/directory.ts`.
const USER_INFO: Liveblocks["UserMeta"][] = [
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
];

// The AI assistant. It can't sign in, but it shows up in the chat and, while
// it edits a document, in Presence like any other member (see `lib/ai`).
export const AI_USER: Liveblocks["UserMeta"] = {
  id: "ai-assistant",
  info: {
    name: "Liveblocks AI",
    color: "#b282fa",
    avatar: "https://liveblocks.io/api/avatar?u=ai-assistant&agent=true",
  },
};

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || undefined;
}

export function getUsers() {
  return USER_INFO;
}

export function getRandomUser() {
  return USER_INFO[Math.floor(Math.random() * USER_INFO.length)];
}

// Pick a stable cursor/caret color for users we don't know (Google accounts)
export function getColorForUserId(userId: string) {
  const colors = USER_INFO.map((u) => u.info.color);
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}
