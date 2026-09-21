export const AI_USER_INFO: Liveblocks["UserMeta"] = {
  id: "__AI_AGENT",
  info: {
    name: "AI Assistant",
    color: "#6366f1",
    avatar: `https://liveblocks.io/api/avatar?u=__AI_AGENT&agent=true`,
  },
};

const USER_INFO: Liveblocks["UserMeta"][] = [
  AI_USER_INFO,
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
    id: "tatum-paolo@example.com",
    info: {
      name: "Tatum Paolo",
      color: "#F0D885",
      avatar: "https://liveblocks.io/avatars/avatar-3.png",
    },
  },
  {
    id: "anjali-wanda@example.com",
    info: {
      name: "Anjali Wanda",
      color: "#85EED6",
      avatar: "https://liveblocks.io/avatars/avatar-4.png",
    },
  },
  {
    id: "jody-hekla@example.com",
    info: {
      name: "Jody Hekla",
      color: "#85BBF0",
      avatar: "https://liveblocks.io/avatars/avatar-5.png",
    },
  },
  {
    id: "emil-joyce@example.com",
    info: {
      name: "Emil Joyce",
      color: "#8594F0",
      avatar: "https://liveblocks.io/avatars/avatar-6.png",
    },
  },
  {
    id: "jory-quispe@example.com",
    info: {
      name: "Jory Quispe",
      color: "#85DBF0",
      avatar: "https://liveblocks.io/avatars/avatar-7.png",
    },
  },
  {
    id: "quinn-elton@example.com",
    info: {
      name: "Quinn Elton",
      color: "#87EE85",
      avatar: "https://liveblocks.io/avatars/avatar-8.png",
    },
  },
];

// What each demo user tends to own. Jev reads these when picking an assignee
// for the "properties" sparkle button, so an issue about a broken checkout
// flow lands with the person who owns checkout even if nobody is named.
const USER_EXPERTISE: Record<string, string> = {
  "charlie.layne@example.com":
    "Frontend UI: React components, CSS, layout and rendering bugs",
  "mislav.abha@example.com":
    "Checkout, cart, pricing, discounts, and payment flows",
  "tatum-paolo@example.com":
    "Backend APIs, database schema and queries, performance",
  "anjali-wanda@example.com":
    "Product design: UX flows, visual polish, design system",
  "jody-hekla@example.com":
    "Infrastructure: CI/CD, deployments, monitoring, developer tooling",
  "emil-joyce@example.com":
    "Authentication, permissions, security and privacy issues",
  "jory-quispe@example.com":
    "Product management: requirements, scoping, roadmap, customer research",
  "quinn-elton@example.com": "Mobile apps, push notifications, accessibility",
};

export function getUserExpertise(id: string): string | null {
  return USER_EXPERTISE[id] ?? null;
}

export function getRandomUser() {
  const realUsers = USER_INFO.filter(({ id }) => id !== AI_USER_INFO.id);
  return realUsers[Math.floor(Math.random() * realUsers.length)];
}

export function getUser(id: string) {
  return USER_INFO.find((u) => u.id === id) || null;
}

export function getUsers() {
  return USER_INFO;
}
