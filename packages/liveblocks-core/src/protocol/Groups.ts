import type { DateToString } from "../lib/DateToString";

export type GroupMemberData = {
  id: string;
  addedAt: Date;
};

export type GroupScopes = {
  mention?: true;
};

export type GroupData = {
  type: "group";
  id: string;
  tenantId: string;
  scopes: GroupScopes;
  createdAt: Date;
  updatedAt: Date;
  members: GroupMemberData[];
};

export type GroupDataPlain = Omit<DateToString<GroupData>, "members"> & {
  members: DateToString<GroupMemberData>[];
};
