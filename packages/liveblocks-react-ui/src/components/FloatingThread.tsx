"use client";

import type {
  BaseMetadata,
  DCM,
  DTM,
  Relax,
  ThreadData,
} from "@liveblocks/core";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  type ForwardedRef,
  forwardRef,
  type ReactNode,
  type RefAttributes,
} from "react";

import { useLiveblocksUiConfig } from "../config";
import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../constants";
import { useOverrides } from "../overrides";
import { cn } from "../utils/cn";
import { useControllableState } from "../utils/use-controllable-state";
import {
  Composer,
  type ComposerCreateThreadProps,
  type ComposerProps,
} from "./Composer";
import type { ThreadProps } from "./Thread";
import { Thread } from "./Thread";

export type FloatingThreadProps<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> = Omit<ThreadProps<TM, CM>, "thread"> &
  Omit<
    ComposerProps<TM, CM>,
    "threadId" | "commentId" | "metadata" | "commentMetadata"
  > &
  ComposerCreateThreadProps<TM, CM> &
  Relax<
    Pick<
      PopoverPrimitive.PopoverProps,
      "defaultOpen" | "open" | "onOpenChange"
    > &
      Pick<
        PopoverPrimitive.PopoverContentProps,
        "side" | "sideOffset" | "align" | "alignOffset"
      >
  > & {
    /**
     * The element which opens the floating thread.
     */
    children: ReactNode;

    /**
     * The thread to display. If not provided, a composer will be displayed instead.
     */
    thread?: ThreadData<TM, CM>;
  };

/**
 * Displays a floating thread attached to a trigger element.
 */
export const FloatingThread = forwardRef(
  <TM extends BaseMetadata = DTM, CM extends BaseMetadata = DCM>(
    {
      thread,
      children,
      defaultOpen,
      open,
      onOpenChange,
      side = "right",
      sideOffset = FLOATING_ELEMENT_SIDE_OFFSET,
      align = "start",
      alignOffset,
      autoFocus = true,
      overrides,
      className,
      ...props
    }: FloatingThreadProps<TM, CM>,
    forwardedRef: ForwardedRef<HTMLDivElement>
  ) => {
    const $ = useOverrides(overrides);
    const { portalContainer } = useLiveblocksUiConfig();
    const [isOpen, setIsOpen] = useControllableState(
      defaultOpen ?? false,
      open,
      onOpenChange
    );

    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal container={portalContainer}>
          <PopoverPrimitive.Content
            className={cn(
              "lb-root lb-portal lb-elevation lb-floating-thread",
              className
            )}
            dir={$.dir}
            side={side}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
            onPointerDownOutside={(event) => {
              // Prevent closing when interacting with elements inside portals
              // (e.g., emoji picker, dropdowns)
              const target = event.target as HTMLElement;
              if (target.closest(".lb-portal")) {
                event.preventDefault();
              }
            }}
            ref={forwardedRef}
          >
            {thread ? (
              <Thread
                thread={thread}
                overrides={overrides}
                autoFocus={autoFocus}
                {...props}
              />
            ) : (
              <Composer
                overrides={overrides}
                autoFocus={autoFocus}
                {...props}
              />
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
) as <TM extends BaseMetadata = DTM, CM extends BaseMetadata = DCM>(
  props: FloatingThreadProps<TM, CM> & RefAttributes<HTMLDivElement>
) => JSX.Element;
