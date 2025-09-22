import { groups } from "@/data/groups";
import { users } from "@/data/users";
import { Group } from "@/types";
import { getGroup } from "./getGroup";

type Props = {
  groupIds?: string[];
  search?: string;
};

type GroupWithMembers = Group & {
  memberIds: string[];
};

/**
 * Get Groups
 *
 * Simulates calling your database and returning a list of groups
 *
 * @param groupIds - The group ids to get
 * @param search - The term to filter your users by, checks users' ids and names
 */
export async function getGroups({ groupIds, search }: Props = {}): Promise<
  (GroupWithMembers | null)[]
> {
  const groupsPromises: Promise<Group | null>[] = [];

  // Filter by userIds or get all users
  if (groupIds) {
    for (const groupId of groupIds) {
      groupsPromises.push(getGroup(groupId));
    }
  } else {
    const allGroupIds = groups.map((group) => group.id);

    for (const groupId of allGroupIds) {
      groupsPromises.push(getGroup(groupId));
    }
  }

  let groupList = await Promise.all(groupsPromises);

  // If search term, check if term is included in name or id, and filter
  if (search) {
    const term = search.toLowerCase();

    groupList = groupList.filter((group) => {
      if (!group) {
        return false;
      }

      return (
        group.name.toLowerCase().includes(term) ||
        group.id.toLowerCase().includes(term)
      );
    });
  }

  return groupList.map((group) =>
    group
      ? {
          ...group,
          memberIds: users
            .filter((user) => user.groupIds.includes(group.id))
            .map((user) => user.id),
        }
      : group
  );
}
