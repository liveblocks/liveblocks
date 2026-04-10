"use client";

import type { BaseMetadata, DCM, DTM, Relax } from "@liveblocks/core";
import { Popover as PopoverPrimitive } from "radix-ui";
import {
  type ForwardedRef,
  forwardRef,
  type ReactNode,
  type RefAttributes,
  useRef,
} from "react";

import { useLiveblocksUiConfig } from "../config";
import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../constants";
import { useOverrides } from "../overrides";
import { cn } from "../utils/cn";
import { useControllableState } from "../utils/use-controllable-state";
import { useRefs } from "../utils/use-refs";
import type { ComposerProps } from "./Composer";
import { Composer } from "./Composer";

export interface FloatingComposerProps<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> extends Omit<
      ComposerProps<TM, CM>,
      "collapsed" | "onCollapsedChange" | "defaultCollapsed"
    >,
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
   * The element which opens the floating composer.
   */
  children: ReactNode;
}

/**
 * Displays a floating composer attached to a trigger element.
 */
export const FloatingComposer = forwardRef(
  <TM extends BaseMetadata = DTM, CM extends BaseMetadata = DCM>(
    {
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
    }: FloatingComposerProps<TM, CM>,
    forwardedRef: ForwardedRef<HTMLFormElement>
  ) => {
    const composerRef = useRef<HTMLFormElement>(null);
    const mergedRefs = useRefs(forwardedRef, composerRef);
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
              "lb-root lb-portal lb-elevation lb-floating-composer",
              className
            )}
            dir={$.dir}
            side={side}
            sideOffset={sideOffset}
            updatePositionStrategy="always"
            align={align}
            alignOffset={alignOffset}
            collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
            onEscapeKeyDown={(event) => {
              if (event.defaultPrevented) {
                return;
              }

              setIsOpen(false);

              // Prevent further parent layers from closing
              event.preventDefault();
            }}
            onInteractOutside={(event) => {
              // Prevent closing when interacting with elements inside portals
              // (e.g., emoji picker, dropdowns)
              const target = event.target as HTMLElement;
              if (target.closest(".lb-portal")) {
                event.preventDefault();
              }
            }}
            onOpenAutoFocus={(event) => {
              if (!autoFocus) {
                event.preventDefault();
                composerRef.current?.focus();
              }
            }}
            asChild
          >
            <Composer
              ref={mergedRefs}
              overrides={overrides}
              autoFocus={autoFocus}
              collapsed={false}
              tabIndex={-1}
              {...(props as ComposerProps<TM, CM>)}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
) as <TM extends BaseMetadata = DTM, CM extends BaseMetadata = DCM>(
  props: FloatingComposerProps<TM, CM> & RefAttributes<HTMLFormElement>
) => JSX.Element;
