"use client";

import {
  Tabs as UiTabs,
  TabsList as UiTabsList,
  TabsPanel as UiTabsPanel,
  TabsTab as UiTabsTab,
  TabsTabIcon as UiTabsTabIcon,
} from "@ui-sdk/react/tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = UiTabs;
export const TabsTabIcon = UiTabsTabIcon;

export function TabsList({
  className,
  ...props
}: ComponentProps<typeof UiTabsList>) {
  return (
    <UiTabsList
      className={cn(
        "inline-flex h-8 items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5 text-neutral-500",
        className
      )}
      {...props}
    />
  );
}

export function TabsTab({
  className,
  ...props
}: ComponentProps<typeof UiTabsTab>) {
  return (
    <UiTabsTab
      className={cn(
        "inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none select-none hover:text-neutral-900 focus-visible:ring-[3px] focus-visible:ring-ring data-selected:bg-white data-selected:text-neutral-900 data-selected:shadow-xs data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
}

export function TabsPanel({
  className,
  ...props
}: ComponentProps<typeof UiTabsPanel>) {
  return <UiTabsPanel className={cn("outline-none", className)} {...props} />;
}
