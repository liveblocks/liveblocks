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
  // Special cases for `@everyone` and `@here` as they're not "real" groups
  if (id === "everyone") {
    return {
      id: "everyone",
      name: "Everyone",
    };
  }

  if (id === "here") {
    return {
      id: "here",
      name: "Here",
    };
  }

  return groups.find((group) => group.id === id) ?? null;
}
