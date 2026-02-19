import type { DateToString } from "../lib/DateToString";

export type GroupMemberData = {
  id: string;
  addedAt: Date;
};

export type GroupScopes = Partial<{ mention: true }>;

export type GroupData = {
  type: "group";
  id: string;
  /**
   * @deprecated Use `organizationId` instead.
   */
  tenantId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  scopes: GroupScopes;
  members: GroupMemberData[];
};

export type GroupDataPlain = Omit<DateToString<GroupData>, "members"> & {
  members: DateToString<GroupMemberData>[];
};
