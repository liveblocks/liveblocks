/**
 * These types are used in `/data`
 */

export type User = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  groupIds: string[];
  organizationIds: string[];
};

export type Group = {
  id: string;
  name: string;
};

export type Organization = {
  id: string;
  name: string;
  avatar: string;
  groups: Group[];
};
