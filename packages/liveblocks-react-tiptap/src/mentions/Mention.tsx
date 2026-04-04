import {
  type GroupMentionData,
  MENTION_CHARACTER,
  type MentionData,
  type UserMentionData,
} from "@liveblocks/core";
import { cn, Group, User } from "@liveblocks/react-ui/_private";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";

import {
  LIVEBLOCKS_GROUP_MENTION_TYPE,
  LIVEBLOCKS_MENTION_TYPE,
  type SerializedTiptapMentionData,
} from "../types";

interface MentionProps {
  mention: MentionData;
  isSelected: boolean;
}
interface GroupMentionProps {
  mention: GroupMentionData;
  isSelected: boolean;
}

const UserMention = ({ isSelected, mention }: MentionProps) => {

  return (
    <NodeViewWrapper
      className={cn(
        "lb-root lb-mention lb-tiptap-mention",
        isSelected && "lb-mention-selected"
      )}
      as="span"
    >
      <span className="lb-mention-symbol">{MENTION_CHARACTER}</span>
      <User userId={mention.id} />
    </NodeViewWrapper>
  );
};

const GroupMention = ({ isSelected, mention }: GroupMentionProps) => {
  return (
    <NodeViewWrapper
      className={cn(
        "lb-root lb-mention lb-tiptap-mention",
        isSelected && "lb-mention-selected"
      )}
      as="span"
    >
      <span className="lb-mention-symbol">{MENTION_CHARACTER}</span>
      <Group groupId={mention.id} />
    </NodeViewWrapper>
  );
};

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

export const Mention = ({ node, selected: isSelected }: ReactNodeViewProps<HTMLSpanElement>) => {
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
      />
    );
  }

  return null;
};
