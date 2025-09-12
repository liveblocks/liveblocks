"use server";

import { LiveblocksError } from "@liveblocks/node";
import { getGroups } from "@/lib/database";
import { liveblocks } from "@/liveblocks.server.config";

/**
 * Sync Groups with Liveblocks
 *
 * Groups on Liveblocks are currently used for group mentions in comments and text editors.
 */
export async function syncLiveblocksGroups() {
  const groups = (await getGroups()).filter((group) => group !== null);

  for (const group of groups) {
    const localMemberIds = new Set(group.memberIds ?? []);

    // Sync group members if the group already exists on Liveblocks
    try {
      const liveblocksMemberIds = new Set(
        (await liveblocks.getGroup({ groupId: group.id })).members.map(
          (member) => member.id
        )
      );
      const memberIdsToAdd: string[] = [];
      const memberIdsToRemove: string[] = [];

      for (const memberId of localMemberIds) {
        if (!liveblocksMemberIds.has(memberId)) {
          memberIdsToAdd.push(memberId);
        }
      }

      for (const memberId of liveblocksMemberIds) {
        if (!localMemberIds.has(memberId)) {
          memberIdsToRemove.push(memberId);
        }
      }

      if (memberIdsToAdd.length > 0) {
        await liveblocks.addGroupMembers({
          groupId: group.id,
          memberIds: memberIdsToAdd,
        });
      }

      if (memberIdsToRemove.length > 0) {
        await liveblocks.removeGroupMembers({
          groupId: group.id,
          memberIds: memberIdsToRemove,
        });
      }
    } catch (error) {
      // Let unrelated and unknown errors through
      if (!(error instanceof LiveblocksError && error.status === 404)) {
        throw error;
      }

      // Create the group on Liveblocks if it doesn't already exist
      await liveblocks.createGroup({
        groupId: group.id,
        memberIds: Array.from(localMemberIds),
      });
    }
  }
}
