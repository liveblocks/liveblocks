export type Workspace = {
  id: string;
  name: string;
};

export type Channel = {
  id: string;
  name: string;
};

// Each workspace maps to its own Liveblocks room, holding its channel list
// (Storage) and one feed per channel (Feeds).
export const WORKSPACES: Workspace[] = [
  { id: "acme", name: "Acme" },
  { id: "initech", name: "Initech" },
];

export const DEFAULT_CHANNELS = ["general", "random"];
