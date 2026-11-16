"use client";

import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectItemIcon as UiSelectItemIcon,
  SelectItemIndicator as UiSelectItemIndicator,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
  SelectValueIcon as UiSelectValueIcon,
} from "@ui-sdk/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { POPUP_CLASS } from "./menu";

export const Select = UiSelect;
export const SelectValue = UiSelectValue;
export const SelectValueIcon = UiSelectValueIcon;
export const SelectItemIcon = UiSelectItemIcon;

export function SelectTrigger({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof UiSelectTrigger>, "children"> & {
  children?: ReactNode;
}) {
  return (
    <UiSelectTrigger
      className={cn(
        "flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-2.5 text-sm whitespace-nowrap text-neutral-900 shadow-xs transition-colors outline-none select-none hover:bg-neutral-50 focus-visible:ring-[3px] focus-visible:ring-ring data-disabled:pointer-events-none data-disabled:opacity-50 data-open:bg-neutral-50 data-placeholder:text-neutral-500 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="size-3.5 text-neutral-400" aria-hidden />
    </UiSelectTrigger>
  );
}

export function SelectContent({
  className,
  ...props
}: ComponentProps<typeof UiSelectContent>) {
  return (
    <UiSelectContent
      sideOffset={6}
      className={cn(POPUP_CLASS, "min-w-(--anchor-width)", className)}
      {...props}
    />
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof UiSelectItem>, "children"> & {
  children?: ReactNode;
}) {
  return (
    <UiSelectItem
      className={cn(
        "relative flex cursor-default items-center gap-2.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-neutral-100 data-highlighted:text-neutral-900 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <UiSelectItemIndicator className="absolute right-2 flex items-center text-primary">
        <CheckIcon className="size-4" aria-hidden />
      </UiSelectItemIndicator>
    </UiSelectItem>
  );
}
