import { cn, Group, User } from "@liveblocks/react-ui/_private";
import type { Node } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { forwardRef } from "react";

import { MENTION_CHARACTER } from "../constants";
import {
  LIVEBLOCKS_GROUP_MENTION_TYPE,
  LIVEBLOCKS_MENTION_TYPE,
} from "../types";

export const Mention = forwardRef<
  HTMLSpanElement,
  { node: Node; selected: boolean }
>(({ node, selected: isSelected }, forwardedRef) => {
  const attrs = node.attrs as { id: string };

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
      {node.type.name === LIVEBLOCKS_MENTION_TYPE ? (
        <User userId={attrs.id} />
      ) : node.type.name === LIVEBLOCKS_GROUP_MENTION_TYPE ? (
        <Group groupId={attrs.id} />
      ) : null}
    </NodeViewWrapper>
  );
});
