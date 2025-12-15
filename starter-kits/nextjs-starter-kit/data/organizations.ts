import liveblocks from "@/public/liveblocks.png";
import { Organization } from "@/types";

/**
 * This array simulates a database consisting of a list of organizations/tenants.
 * Each user has a personal organization with their ID as the organization ID.
 * Assign users to organizations in /data/users.ts
 * Each organization has its own set of groups.
 */
export const organizations: Organization[] = [
  {
    id: "liveblocks",
    name: "Liveblocks",
    avatar: liveblocks.src,
    groups: [
      {
        id: "product",
        name: "Product",
      },
      {
        id: "engineering",
        name: "Engineering",
      },
      {
        id: "design",
        name: "Design",
      },
    ],
  },
  {
    id: "charlie.layne@example.com",
    name: "Charlie Layne",
    avatar: "https://liveblocks.io/avatars/avatar-2.png",
    groups: [
      {
        id: "recipes",
        name: "Recipes",
      },
      {
        id: "notes",
        name: "Notes",
      },
    ],
  },
  {
    id: "mislav.abha@example.com",
    name: "Mislav Abha",
    avatar: "https://liveblocks.io/avatars/avatar-3.png",
    groups: [
      {
        id: "articles",
        name: "Articles",
      },
    ],
  },
  {
    id: "tatum.paolo@example.com",
    name: "Tatum Paolo",
    avatar: "https://liveblocks.io/avatars/avatar-4.png",
    groups: [],
  },
  {
    id: "anjali.wanda@example.com",
    name: "Anjali Wanda",
    avatar: "https://liveblocks.io/avatars/avatar-5.png",
    groups: [],
  },
  {
    id: "emil.joyce@example.com",
    name: "Emil Joyce",
    avatar: "https://liveblocks.io/avatars/avatar-6.png",
    groups: [],
  },
];
