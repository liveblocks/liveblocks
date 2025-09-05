import { cn, User } from "@liveblocks/react-ui/_private";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";

const MENTION_CHARACTER = "@";

export const Mention = (props: ReactNodeViewProps<HTMLSpanElement>) => {
  const id = (props.node.attrs as { id: string }).id;

  return (
    <NodeViewWrapper
      className={cn(
        "lb-root lb-mention lb-tiptap-mention",
        props.selected ? "lb-mention-selected" : null
      )}
      as="span"
    >
      <span className="lb-mention-symbol">{MENTION_CHARACTER}</span>
      <User userId={id} />
    </NodeViewWrapper>
  );
};
