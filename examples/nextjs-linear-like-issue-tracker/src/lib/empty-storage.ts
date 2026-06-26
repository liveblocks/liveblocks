import { ImmutableStorage } from "@/liveblocks.config";

// Default storage used by the route shell, before a room's real storage is
// available. The shared widget fallbacks render their "empty" state from this
// (no priority, no progress, unassigned, no labels/links), so the shell looks
// identical to the client-side loading state.
export const EMPTY_STORAGE: ImmutableStorage = {
  meta: { title: "" },
  properties: { progress: "none", priority: "none", assignedTo: "none" },
  labels: [],
  links: [],
};
