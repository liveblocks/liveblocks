"use client";

import {
  Menu as UiMenu,
  MenuContent as UiMenuContent,
  MenuItem as UiMenuItem,
  MenuItemIndicator as UiMenuItemIndicator,
  MenuRadioGroup as UiMenuRadioGroup,
  MenuRadioItem as UiMenuRadioItem,
  MenuSeparator as UiMenuSeparator,
  MenuTrigger as UiMenuTrigger,
} from "@ui-sdk/react/menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Menu = UiMenu;
export const MenuTrigger = UiMenuTrigger;
export const MenuRadioGroup = UiMenuRadioGroup;
export const MenuItemIndicator = UiMenuItemIndicator;

/**
 * The look of every popup in the app (menus and suggestions): a short
 * settle from the corner it's anchored to.
 */
export const POPUP_CLASS =
  "z-50 origin-(--transform-origin) rounded-lg border border-line bg-surface p-1 text-ink shadow-sm outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-none";

export const POPUP_ITEM_CLASS =
  "relative flex h-7 cursor-default items-center gap-2 rounded pr-2 pl-1.5 text-[13px] leading-none outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-40 data-highlighted:bg-hover [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 [&_svg:not([class*='text-'])]:text-ink-muted";

export function MenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof UiMenuContent>) {
  return (
    <UiMenuContent
      sideOffset={sideOffset}
      className={cn(
        POPUP_CLASS,
        "max-h-(--available-height) min-w-32 overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  );
}

export function MenuItem({
  className,
  ...props
}: ComponentProps<typeof UiMenuItem>) {
  return <UiMenuItem className={cn(POPUP_ITEM_CLASS, className)} {...props} />;
}

export function MenuRadioItem({
  className,
  ...props
}: ComponentProps<typeof UiMenuRadioItem>) {
  return (
    <UiMenuRadioItem className={cn(POPUP_ITEM_CLASS, className)} {...props} />
  );
}

export function MenuSeparator({
  className,
  ...props
}: ComponentProps<typeof UiMenuSeparator>) {
  return (
    <UiMenuSeparator
      className={cn("-mx-1 my-1 h-px bg-line", className)}
      {...props}
    />
  );
}
