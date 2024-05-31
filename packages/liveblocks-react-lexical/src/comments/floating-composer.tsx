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
> &
  FloatingSelectionContainerProps;

export const FloatingComposer = forwardRef<
  ComposerElement,
  FloatingComposerProps
>(function FloatingComposer(props, forwardedRef) {
  const { sideOffset, alignOffset, ...composerProps } = props;
  return (
    <FloatingSelectionContainer
      sideOffset={sideOffset}
      alignOffset={alignOffset}
    >
      <Composer {...composerProps} ref={forwardedRef} />
    </FloatingSelectionContainer>
  );
});
