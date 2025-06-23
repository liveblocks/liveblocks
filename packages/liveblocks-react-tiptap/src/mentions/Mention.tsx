import type { Node } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { forwardRef } from "react";

import { classNames } from "../classnames";
import { MENTION_CHARACTER } from "../constants";
import { User } from "./MentionsList";

export const Mention = forwardRef<
  HTMLSpanElement,
  { node: Node; selected: boolean }
>((props, forwardedRef) => {
  const id = (props.node.attrs as { id: string }).id;
  const classnames = classNames(
    "lb-root",
    "lb-tiptap-mention",
    props.selected ? "lb-mention-selected" : null
  );
  return (
    <NodeViewWrapper className={classnames} as="span" ref={forwardedRef}>
      {MENTION_CHARACTER}
      {/* TODO: Display group name if kind is group */}
      <User userId={id} />
    </NodeViewWrapper>
  );
});
