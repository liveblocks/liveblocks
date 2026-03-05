import { Organization } from "@/types";

/**
 * This array simulates a database consisting of a list of organizations/tenants.
 * Assign users to organizations in /data/users.ts
 */
export const organizations: Organization[] = [
  {
    id: "liveblocks",
    name: "Liveblocks",
    avatar: "/liveblocks.png",
  },
  {
    id: "charlie.layne@example.com",
    name: "Charlie's space",
    avatar: "https://liveblocks.io/avatars/avatar-2.png",
  },
  {
    id: "mislav.abha@example.com",
    name: "Mislav's space",
    avatar: "https://liveblocks.io/avatars/avatar-3.png",
  },
  {
    id: "tatum.paolo@example.com",
    name: "Tatum's space",
    avatar: "https://liveblocks.io/avatars/avatar-4.png",
  },
  {
    id: "anjali.wanda@example.com",
    name: "Anjali's space",
    avatar: "https://liveblocks.io/avatars/avatar-5.png",
  },
  {
    id: "emil.joyce@example.com",
    name: "Emil's space",
    avatar: "https://liveblocks.io/avatars/avatar-6.png",
  },
];
