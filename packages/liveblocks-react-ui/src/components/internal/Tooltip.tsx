"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import { useLiveblocksUiConfig } from "../../config";
import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { cn } from "../../utils/cn";
import { isApple } from "../../utils/is-apple";

const ALT_KEY = { title: "Alt", key: "⌥" };
const COMMAND_KEY = { title: "Command", key: "⌘" };
const CONTROL_KEY = { title: "Ctrl", key: "⌃" };
const SHIFT_KEY = { title: "Shift", key: "⇧" };
const ENTER_KEY = { title: "Enter", key: "⏎" };
const SPACE_KEY = { title: "Space", key: "␣" };
const ESCAPE_KEY = { title: "Escape", key: "⎋" };

const KEYS = {
  alt: () => ALT_KEY,
  mod: () => (isApple() ? COMMAND_KEY : CONTROL_KEY),
  control: () => CONTROL_KEY,
  ctrl: () => CONTROL_KEY,
  command: () => COMMAND_KEY,
  cmd: () => COMMAND_KEY,
  shift: () => SHIFT_KEY,
  enter: () => ENTER_KEY,
  " ": () => SPACE_KEY,
  space: () => SPACE_KEY,
  escape: () => ESCAPE_KEY,
  esc: () => ESCAPE_KEY,
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
        const lowerKey = key.toLowerCase();

        if (lowerKey in KEYS) {
          return (
            <ShortcutTooltipKey
              key={index}
              name={lowerKey as keyof typeof KEYS}
            />
          );
        }

        return <span key={index}>{key}</span>;
      })}
    </>
  );
}

export const Tooltip = forwardRef<HTMLButtonElement, TooltipProps>(
  ({ children, content, multiline, className, ...props }, forwardedRef) => {
    const { portalContainer } = useLiveblocksUiConfig();

    return (
      <TooltipPrimitive.Root disableHoverableContent>
        <TooltipPrimitive.Trigger asChild ref={forwardedRef}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={portalContainer}>
          <TooltipPrimitive.Content
            className={cn(
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

export const TooltipProvider = TooltipPrimitive.Provider;
