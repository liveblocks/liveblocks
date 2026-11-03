export type WorkspaceTheme = {
  sidebar: string;
  brand: string;
};

export type Workspace = {
  id: string;
  name: string;
  theme: WorkspaceTheme;
};

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

export function getWorkspace(workspaceId: string): Workspace {
  return (
    WORKSPACES.find((workspace) => workspace.id === workspaceId) ??
    WORKSPACES[0]
  );
}
