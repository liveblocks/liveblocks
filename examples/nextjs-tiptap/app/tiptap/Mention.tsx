import { useUser } from "@liveblocks/react";
import { useOverrides } from "@liveblocks/react-ui";
import { NodeViewWrapper } from "@tiptap/react";
import { forwardRef } from "react";
import { classNames } from "./classnames";

export default forwardRef<HTMLSpanElement, { node: any, selected: boolean }>(
  function User(props, forwardedRef) {
    const { user, isLoading } = useUser(props.node.attrs.id);
    const $ = useOverrides();
    const name =
      user === undefined || user === null ? $.USER_UNKNOWN : user.name;

    const classnames = classNames('lb-mention', props.selected ? 'lb-mention-selected' : null);

    return (
      <NodeViewWrapper className={classnames} as="span"
        ref={forwardedRef}>
        @{isLoading ? null : name}
      </NodeViewWrapper>
    )
  }
);
