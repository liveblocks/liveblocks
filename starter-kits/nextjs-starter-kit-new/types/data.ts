/**
 * These types are used in `/data`
 */

export type User = {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  groupIds: string[];
};

export type Group = {
  id: string;
  name: string;
};
