import liveblocks from "@/public/liveblocks.png";
import { Organization } from "@/types";

/**
 * This array simulates a database consisting of a list of organizations/tenants.
 * Note: Personal organizations are dynamically created using the user's ID.
 * Assign users to organizations in /data/users.ts
 */
export const organizations: Organization[] = [
  {
    id: "liveblocks",
    name: "Liveblocks",
    avatar: liveblocks.src,
  },
];
