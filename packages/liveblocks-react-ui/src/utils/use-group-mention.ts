import type { GroupMentionData } from "@liveblocks/core";
import { useGroup } from "@liveblocks/react/_private";
import { useMemo } from "react";

import { useCurrentUserId } from "../shared";
import { useInitial } from "./use-initial";

export function useIsGroupMentionMember(mention: GroupMentionData): boolean {
  // Changing the contents of a group mention is not supported
  // to support the Rules of Hooks.
  const frozenMention = useInitial(mention);
  const frozenUserIds = frozenMention.userIds;

  // This is enforced at the type level, but just in case.
  if (frozenMention.kind !== "group") {
    return false;
  } else if (Array.isArray(frozenUserIds)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const currentId = useCurrentUserId();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const isMember = useMemo(() => {
      return frozenUserIds.some((userId) => userId === currentId);
    }, [frozenUserIds, currentId]);

    return isMember;
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const currentId = useCurrentUserId();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { group } = useGroup(frozenMention.id);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const isMember = useMemo(() => {
      return Boolean(group?.members.some((member) => member.id === currentId));
    }, [group, currentId]);

    return isMember;
  }
}
