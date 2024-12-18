"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps, ReactNode } from "react";
import React, { forwardRef, useMemo } from "react";

import { useLiveblocksUIConfig } from "../../config";
import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { classNames } from "../../utils/class-names";
import { isApple } from "../../utils/is-apple";

const KEYS = {
  Alt: () => ({ title: "Alt", key: "⌥" }),
  Mod: () =>
    isApple() ? { title: "Command", key: "⌘" } : { title: "Ctrl", key: "⌃" },
  Control: () => ({ title: "Ctrl", key: "⌃" }),
  Cmd: () => ({ title: "Command", key: "⌘" }),
  Shift: () => {
    return { title: "Shift", key: "⇧" };
  },
  Enter: () => {
    return { title: "Enter", key: "⏎" };
  },
  " ": () => {
    return { title: "Space", key: "␣" };
  },
  Escape: () => {
    return { title: "Escape", key: "⎋" };
  },
} as const;

export interface TooltipProps
  extends Pick<TooltipPrimitive.TooltipTriggerProps, "children">,
    Omit<TooltipPrimitive.TooltipContentProps, "content"> {
  content: ReactNode;
  multiline?: boolean;
}

export interface ShortcutTooltipProps extends TooltipProps {
  shortcut?: string;
}

export interface ShortcutTooltipKeyProps extends ComponentProps<"abbr"> {
  name: keyof typeof KEYS;
}

function getShortcutKbdFromKeymap(keymap: string) {
  const keys = keymap.split("-");

  return (
    <>
      {keys.map((key, index) => {
        if (key in KEYS) {
          return (
            <ShortcutTooltipKey key={index} name={key as keyof typeof KEYS} />
          );
        }

        return <span key={index}>{key}</span>;
      })}
    </>
  );
}

export const Tooltip = forwardRef<HTMLButtonElement, TooltipProps>(
  ({ children, content, multiline, className, ...props }, forwardedRef) => {
    const { portalContainer } = useLiveblocksUIConfig();

    return (
      <TooltipPrimitive.Root disableHoverableContent>
        <TooltipPrimitive.Trigger asChild ref={forwardedRef}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={portalContainer}>
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
  const shortcutKbd = useMemo(() => {
    return shortcut ? getShortcutKbdFromKeymap(shortcut) : null;
  }, [shortcut]);

  return (
    <Tooltip
      content={
        <>
          {content}
          {shortcutKbd && (
            <kbd className="lb-tooltip-shortcut">{shortcutKbd}</kbd>
          )}
        </>
      }
      {...props}
      ref={forwardedRef}
    >
      {children}
    </Tooltip>
  );
});

function ShortcutTooltipKey({ name, ...props }: ShortcutTooltipKeyProps) {
  const { title, key } = useMemo(() => KEYS[name]?.(), [name]);

  return (
    <abbr title={title} {...props}>
      {key}
    </abbr>
  );
}

export { TooltipProvider } from "@radix-ui/react-tooltip";
