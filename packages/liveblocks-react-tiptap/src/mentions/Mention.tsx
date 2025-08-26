import { cn, User } from "@liveblocks/react-ui/_private";
import type { Node } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { forwardRef } from "react";

const MENTION_CHARACTER = "@";

export const Mention = forwardRef<
  HTMLSpanElement,
  { node: Node; selected: boolean }
>((props, forwardedRef) => {
  const id = (props.node.attrs as { id: string }).id;

  return (
    <NodeViewWrapper
      className={cn(
        "lb-root lb-mention lb-tiptap-mention",
        props.selected ? "lb-mention-selected" : null
      )}
      as="span"
      ref={forwardedRef}
    >
      <span className="lb-mention-symbol">{MENTION_CHARACTER}</span>
      <User userId={id} />
    </NodeViewWrapper>
  );
});
