import { cn, User } from "@liveblocks/react-ui/_private";
import type { Node } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { forwardRef } from "react";

import { MENTION_CHARACTER } from "../constants";

export const Mention = forwardRef<
  HTMLSpanElement,
  { node: Node; selected: boolean }
>((props, forwardedRef) => {
  const id = (props.node.attrs as { id: string }).id;

  return (
    <NodeViewWrapper
      className={cn(
        "lb-root lb-tiptap-mention",
        props.selected ? "lb-mention-selected" : null
      )}
      as="span"
      ref={forwardedRef}
    >
      {MENTION_CHARACTER}
      {/* TODO: Display group name if kind is group */}
      <User userId={id} />
    </NodeViewWrapper>
  );
});
