import { BASE_ROOM_ID } from "./conversation";

// A workspace is one shared inbox, backed by one Liveblocks room. Only the
// default workspace can be connected to a Resend inbox (the webhook writes
// into its room); the others always run on sample data.

export type WorkspaceId = "support" | "sales";

export type Workspace = {
  id: WorkspaceId;
  name: string;
  // Address shown while the workspace isn't connected to a Resend inbox.
  address: string;
  connectable: boolean;
};

export const WORKSPACES: Workspace[] = [
  {
    id: "support",
    name: "Relay Support",
    address: "support@relay.example",
    connectable: true,
  },
  {
    id: "sales",
    name: "Relay Sales",
    address: "sales@relay.example",
    connectable: false,
  },
];

export const DEFAULT_WORKSPACE_ID: WorkspaceId = "support";

export function getWorkspace(id: WorkspaceId): Workspace {
  return WORKSPACES.find((workspace) => workspace.id === id) ?? WORKSPACES[0];
}

export function workspaceForRoomId(roomId: string): Workspace {
  return (
    WORKSPACES.find(
      (workspace) =>
        workspace.id !== DEFAULT_WORKSPACE_ID &&
        roomId.startsWith(`${BASE_ROOM_ID}:${workspace.id}`)
    ) ?? getWorkspace(DEFAULT_WORKSPACE_ID)
  );
}

// The default workspace keeps the bare room id so the Resend webhook (which
// only knows the inbox, not the UI) lands in the right room.
export function roomIdForWorkspace(
  workspaceId: WorkspaceId,
  exampleId?: string | null
) {
  const base =
    workspaceId === DEFAULT_WORKSPACE_ID
      ? BASE_ROOM_ID
      : `${BASE_ROOM_ID}:${workspaceId}`;
  return exampleId ? `${base}-${exampleId}` : base;
}
