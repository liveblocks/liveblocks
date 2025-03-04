import type { Node } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { forwardRef } from "react";

import { classNames } from "../classnames";
import { User } from "./MentionsList";

const MENTION_CHARACTER = "@";

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
      <User userId={id} />
    </NodeViewWrapper>
  );
});
