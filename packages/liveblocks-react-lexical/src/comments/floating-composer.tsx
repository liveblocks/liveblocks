import { Composer, ComposerProps } from "@liveblocks/react-comments";
import React, { ComponentRef, forwardRef, KeyboardEvent } from "react";
import { FloatingSelectionContainer } from "../floating-selection-container";
import type { BaseMetadata } from "@liveblocks/core";
import {
  useHideFloatingComposer,
  useShowFloatingComposer,
} from "./comment-plugin-provider";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

type ComposerElement = ComponentRef<typeof Composer>;

type ThreadMetadata = {
  resolved?: boolean;
};

type FloatingComposerProps<M extends BaseMetadata = ThreadMetadata> = Omit<
  ComposerProps<M>,
  "threadId" | "commentId"
>;

export const FloatingComposer = forwardRef<
  ComposerElement,
  FloatingComposerProps
>(function FloatingComposer(props, forwardedRef) {
  const shouldShowFloatingComposer = useShowFloatingComposer();
  const hideFloatingComposer = useHideFloatingComposer();
  const [editor] = useLexicalComposerContext();

  if (!shouldShowFloatingComposer) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      hideFloatingComposer();
      editor.focus();
    }
  }

  return (
    <FloatingSelectionContainer
      sideOffset={5}
      alignOffset={0}
      collisionPadding={5}
    >
      <Composer
        autoFocus
        onKeyDown={handleKeyDown}
        {...props}
        ref={forwardedRef}
      />
    </FloatingSelectionContainer>
  );
});
