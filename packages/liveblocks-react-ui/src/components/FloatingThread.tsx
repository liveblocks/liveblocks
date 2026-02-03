"use client";

import type { BaseMetadata, DCM, DTM, Relax } from "@liveblocks/core";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
} from "react";

import { useLiveblocksUiConfig } from "../config";
import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../constants";
import { useOverrides } from "../overrides";
import { cn } from "../utils/cn";
import { useControllableState } from "../utils/use-controllable-state";
import type { ThreadProps } from "./Thread";
import { Thread } from "./Thread";

export interface FloatingThreadProps<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> extends ThreadProps<TM, CM>,
    Relax<
      Pick<
        PopoverPrimitive.PopoverProps,
        "defaultOpen" | "open" | "onOpenChange"
      > &
        Pick<
          PopoverPrimitive.PopoverContentProps,
          "side" | "sideOffset" | "align" | "alignOffset"
        >
    > {
  /**
   * The element that triggers the popover.
   */
  children: ReactNode;
}

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
      overrides,
      onKeyDown,
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

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);

        if (event.key === "Escape") {
          setIsOpen(false);
        }
      },
      [onKeyDown, setIsOpen]
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
            asChild
          >
            <Thread
              ref={forwardedRef}
              thread={thread}
              overrides={overrides}
              onKeyDown={handleKeyDown}
              {...props}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
) as <TM extends BaseMetadata = DTM, CM extends BaseMetadata = DCM>(
  props: FloatingThreadProps<TM, CM> & RefAttributes<HTMLDivElement>
) => JSX.Element;
