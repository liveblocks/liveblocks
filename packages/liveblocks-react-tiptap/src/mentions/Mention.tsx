import {
  type GroupMentionData,
  type MentionData,
  type UserMentionData,
} from "@liveblocks/core";
import { useOverrides } from "@liveblocks/react-ui";
import {
  cn,
  Group,
  Tooltip,
  TooltipProvider,
  useGroupMentionSummary,
  User,
} from "@liveblocks/react-ui/_private";
import type { Node } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { MENTION_CHARACTER } from "../constants";
import {
  LIVEBLOCKS_GROUP_MENTION_TYPE,
  LIVEBLOCKS_MENTION_TYPE,
  type SerializedTiptapMentionData,
} from "../types";

interface MentionProps extends ComponentPropsWithoutRef<"span"> {
  mention: MentionData;
  isSelected: boolean;
}

const UserMention = forwardRef<HTMLSpanElement, MentionProps>(
  ({ mention, isSelected }, forwardedRef) => {
    return (
      <NodeViewWrapper
        className={cn(
          "lb-root lb-tiptap-mention",
          isSelected && "lb-mention-selected"
        )}
        as="span"
        ref={forwardedRef}
      >
        {MENTION_CHARACTER}
        <User userId={mention.id} />
      </NodeViewWrapper>
    );
  }
);

const GroupMention = forwardRef<HTMLSpanElement, MentionProps>(
  ({ mention, isSelected }, forwardedRef) => {
    const $ = useOverrides();
    const { summary, isLoading: isLoadingSummary } = useGroupMentionSummary(
      mention as GroupMentionData
    );

    const content = (
      <NodeViewWrapper
        className={cn(
          "lb-root lb-tiptap-mention",
          isSelected && "lb-mention-selected"
        )}
        as="span"
        ref={forwardedRef}
      >
        {MENTION_CHARACTER}
        <Group groupId={mention.id} />
      </NodeViewWrapper>
    );

    // Don't display the tooltip if we won't have a summary.
    if (!isLoadingSummary && summary?.totalMembers === undefined) {
      return content;
    }

    return (
      // Ideally `TooltipProvider` would wrap the entire editor but we don't own it.
      <TooltipProvider>
        <Tooltip
          content={
            <span
              className="lb-group-members"
              data-loading={isLoadingSummary ? "" : undefined}
            >
              {isLoadingSummary
                ? null
                : $.GROUP_MEMBERS_DESCRIPTION(summary?.totalMembers ?? 0)}
            </span>
          }
        >
          {content}
        </Tooltip>
      </TooltipProvider>
    );
  }
);

function deserializeGroupUserIds(
  userIds: string | undefined
): string[] | undefined {
  if (typeof userIds !== "string") {
    return undefined;
  }

  try {
    const parsedUserIds = JSON.parse(userIds) as string[];

    if (Array.isArray(parsedUserIds)) {
      return parsedUserIds;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export const Mention = forwardRef<
  HTMLSpanElement,
  { node: Node; selected: boolean }
>(({ node, selected: isSelected }, forwardedRef) => {
  const attrs = node.attrs as Omit<SerializedTiptapMentionData, "kind">;

  if (node.type.name === LIVEBLOCKS_MENTION_TYPE) {
    const mention: UserMentionData = {
      kind: "user",
      id: attrs.id,
    };

    return (
      <UserMention
        mention={mention}
        isSelected={isSelected}
        ref={forwardedRef}
      />
    );
  }

  if (node.type.name === LIVEBLOCKS_GROUP_MENTION_TYPE) {
    const mention: GroupMentionData = {
      kind: "group",
      id: attrs.id,
      userIds: deserializeGroupUserIds(attrs.userIds),
    };

    return (
      <GroupMention
        mention={mention}
        isSelected={isSelected}
        ref={forwardedRef}
      />
    );
  }

  return null;
});
