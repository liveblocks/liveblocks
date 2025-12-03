import { Workspace } from "@/types";

/**
 * This array simulates a database consisting of a list of workspaces/tenants.
 * Assign users to workspaces in /data/users.ts
 */
export const workspaces: Workspace[] = [
  {
    id: "default",
    name: "Default",
  },
  {
    id: "acme-corp",
    name: "Acme Corp",
  },
  {
    id: "tech-startup",
    name: "Tech Startup",
  },
  {
    id: "design-agency",
    name: "Design Agency",
  },
];
