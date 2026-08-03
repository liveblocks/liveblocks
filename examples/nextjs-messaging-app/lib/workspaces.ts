import type { CSSProperties } from "react";

export type WorkspaceTheme = {
  sidebar: string;
  brand: string;
};

export type Workspace = {
  id: string;
  name: string;
  theme: WorkspaceTheme;
};

export type Channel = {
  id: string;
  name: string;
};

// Each workspace maps to its own Liveblocks room, holding its channel list
export const WORKSPACES: Workspace[] = [
  {
    id: "acme",
    name: "Acme",
    theme: {
      sidebar: "#3f0e40",
      brand: "#0282cc",
    },
  },
  {
    id: "initech",
    name: "Initech",
    theme: {
      sidebar: "#0f3d3e",
      brand: "#0d9488",
    },
  },
];

export const DEFAULT_CHANNELS = ["general", "random"];

export function getWorkspace(workspaceId: string): Workspace {
  return (
    WORKSPACES.find((workspace) => workspace.id === workspaceId) ??
    WORKSPACES[0]
  );
}

/** CSS custom properties for the active workspace theme. */
export function getWorkspaceThemeStyle(workspace: Workspace): CSSProperties {
  return {
    ["--sidebar-bg" as string]: workspace.theme.sidebar,
    ["--brand" as string]: workspace.theme.brand,
  };
}
