import { groups } from "@/data/groups";
import { Group } from "@/types";

/**
 * Get Group
 *
 * Simulates calling your database and returning a group
 *
 * @param id - The group's id
 */
export async function getGroup(id: string): Promise<Group | null> {
  return groups.find((group) => group.id === id) ?? null;
}
