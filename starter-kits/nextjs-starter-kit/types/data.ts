/**
 * These types are used in `/data`
 */

export type User = {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  groupIds: string[];
  workspaceIds: string[];
};

export type Group = {
  id: string;
  name: string;
};

export type Workspace = {
  id: string;
  name: string;
};
