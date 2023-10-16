"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps, ReactNode } from "react";
import React, { forwardRef, useMemo } from "react";

import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { classNames } from "../../utils/class-names";
import { isApple } from "../../utils/is-apple";

const KEYS = {
  alt: () => ({ title: "Alt", key: "⌥" }),
  mod: () =>
    isApple() ? { title: "Command", key: "⌘" } : { title: "Ctrl", key: "⌃" },
  shift: () => {
    return { title: "Shift", key: "⇧" };
  },
  enter: () => {
    return { title: "Enter", key: "⏎" };
  },
} as const;

export interface TooltipProps
  extends Pick<TooltipPrimitive.TooltipTriggerProps, "children">,
    Omit<TooltipPrimitive.TooltipContentProps, "content"> {
  content: ReactNode;
  multiline?: boolean;
}

export interface ShortcutTooltipProps extends TooltipProps {
  shortcut?: ReactNode;
}

export interface ShortcutTooltipKeyProps extends ComponentProps<"abbr"> {
  name: keyof typeof KEYS;
}

export const Tooltip = forwardRef<HTMLButtonElement, TooltipProps>(
  ({ children, content, multiline, className, ...props }, forwardedRef) => {
    return (
      <TooltipPrimitive.Root disableHoverableContent>
        <TooltipPrimitive.Trigger asChild ref={forwardedRef}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={classNames(
              "lb-root lb-portal lb-tooltip",
              multiline && "lb-tooltip:multiline",
              className
            )}
            side="top"
            align="center"
            sideOffset={FLOATING_ELEMENT_SIDE_OFFSET}
            collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
            {...props}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  }
);

export const ShortcutTooltip = forwardRef<
  HTMLButtonElement,
  ShortcutTooltipProps
>(({ children, content, shortcut, ...props }, forwardedRef) => {
  return (
    <Tooltip
      content={
        <>
          {content}
          {shortcut && <kbd className="lb-tooltip-shortcut">{shortcut}</kbd>}
        </>
      }
      {...props}
      ref={forwardedRef}
    >
      {children}
    </Tooltip>
  );
});

export function ShortcutTooltipKey({
  name,
  ...props
}: ShortcutTooltipKeyProps) {
  const { title, key } = useMemo(() => KEYS[name]?.(), [name]);

  return (
    <abbr title={title} {...props}>
      {key}
    </abbr>
  );
}

export { TooltipProvider } from "@radix-ui/react-tooltip";
