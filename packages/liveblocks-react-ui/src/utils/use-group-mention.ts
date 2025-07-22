import type {
  AsyncResult,
  GroupMentionData,
  GroupSummary,
} from "@liveblocks/core";
import { useGroupSummary } from "@liveblocks/react/_private";
import { useMemo } from "react";

import { useCurrentUserId } from "../shared";
import { useInitial } from "./use-initial";

export function useGroupMentionSummary(
  mention: GroupMentionData
): AsyncResult<GroupSummary | undefined, "summary"> {
  // Changing the contents of a group mention is not supported
  // to support the Rules of Hooks.
  const frozenMention = useInitial(mention);
  const frozenUserIds = frozenMention.userIds;

  // This is enforced at the type level, but just in case.
  if (frozenMention.kind !== "group") {
    return {
      summary: undefined,
      isLoading: false,
      error: undefined,
    };
  } else if (Array.isArray(frozenUserIds)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const currentId = useCurrentUserId();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const isMember = useMemo(() => {
      return frozenUserIds.some((userId) => userId === currentId);
    }, [frozenUserIds, currentId]);

    return {
      summary: {
        id: frozenMention.id,
        isMember,
        totalMembers: frozenUserIds.length,
      },
      isLoading: false,
      error: undefined,
    };
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useGroupSummary(frozenMention.id);
  }
}
