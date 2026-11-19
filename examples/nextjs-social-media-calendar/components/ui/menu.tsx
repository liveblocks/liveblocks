"use client";

import {
  Menu as UiMenu,
  MenuContent as UiMenuContent,
  MenuGroup as UiMenuGroup,
  MenuGroupLabel as UiMenuGroupLabel,
  MenuItem as UiMenuItem,
  MenuItemIcon as UiMenuItemIcon,
  MenuSeparator as UiMenuSeparator,
  MenuTrigger as UiMenuTrigger,
} from "@ui-sdk/react/menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Menu = UiMenu;
export const MenuTrigger = UiMenuTrigger;
export const MenuGroup = UiMenuGroup;
export const MenuItemIcon = UiMenuItemIcon;

/** Shared look for every popup in the app (menus, selects). */
export const POPUP_CLASS =
  "z-50 min-w-32 origin-(--transform-origin) rounded-lg bg-white p-1 text-neutral-900 shadow-lg ring-1 ring-neutral-950/10 outline-none transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none";

export function MenuContent({
  className,
  ...props
}: ComponentProps<typeof UiMenuContent>) {
  return (
    <UiMenuContent
      sideOffset={6}
      className={cn(POPUP_CLASS, className)}
      {...props}
    />
  );
}

export function MenuGroupLabel({
  className,
  ...props
}: ComponentProps<typeof UiMenuGroupLabel>) {
  return (
    <UiMenuGroupLabel
      className={cn("px-2 py-1.5 text-xs text-neutral-500", className)}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: ComponentProps<typeof UiMenuSeparator>) {
  return (
    <UiMenuSeparator
      className={cn("-mx-1 my-1 h-px bg-neutral-950/5", className)}
      {...props}
    />
  );
}

export function MenuItem({
  className,
  ...props
}: ComponentProps<typeof UiMenuItem>) {
  return (
    <UiMenuItem
      className={cn(
        "relative flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none select-none data-destructive:text-red-600 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-neutral-100 data-highlighted:text-neutral-900 data-pending:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
}
