import { groups } from "@/data/groups";
import { Group } from "@/types";

/**
 * Get Groups
 *
 * Simulates calling your database and returning a list of groups
 *
 * @param ids - The group ids
 */
export async function getGroups(ids: string[]): Promise<Group[]> {
  return groups.filter((group) => ids.includes(group.id));
}
