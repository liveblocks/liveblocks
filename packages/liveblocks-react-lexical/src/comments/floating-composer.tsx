import { Composer, ComposerProps } from "@liveblocks/react-comments";
import React, { ComponentRef, forwardRef } from "react";
import {
  FloatingSelectionContainer,
  FloatingSelectionContainerProps,
} from "../floating-selection-container";
import type { BaseMetadata } from "@liveblocks/core";

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
  const { ...composerProps } = props;
  return (
    <FloatingSelectionContainer
      sideOffset={5}
      alignOffset={0}
      collisionPadding={5}
    >
      <Composer {...composerProps} ref={forwardedRef} />
    </FloatingSelectionContainer>
  );
});
