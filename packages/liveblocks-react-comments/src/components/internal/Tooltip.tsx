"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps, ReactNode } from "react";
import React, { useMemo } from "react";

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

interface TooltipProps
  extends Pick<TooltipPrimitive.TooltipTriggerProps, "children">,
    TooltipPrimitive.TooltipContentProps {
  content: ReactNode;
  shortcut?: ReactNode;
}

interface TooltipShortcutKeyProps extends ComponentProps<"abbr"> {
  name: keyof typeof KEYS;
}

export function Tooltip({
  children,
  content,
  shortcut,
  className,
  ...props
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root disableHoverableContent>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={classNames("lb-root lb-tooltip", className)}
          side="top"
          align="center"
          sideOffset={FLOATING_ELEMENT_SIDE_OFFSET}
          collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
          {...props}
        >
          {content}
          {shortcut && <kbd className="lb-tooltip-shortcut">{shortcut}</kbd>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function TooltipShortcutKey({
  name,
  ...props
}: TooltipShortcutKeyProps) {
  const { title, key } = useMemo(() => KEYS[name]?.(), [name]);

  return (
    <abbr title={title} {...props}>
      {key}
    </abbr>
  );
}

export { TooltipProvider } from "@radix-ui/react-tooltip";
