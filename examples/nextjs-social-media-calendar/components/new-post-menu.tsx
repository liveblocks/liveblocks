"use client";

import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PLATFORM_INFO,
  PLATFORMS,
  PlatformBadge,
  type Platform,
} from "@/lib/platforms";

/**
 * A dropdown listing every platform. Wraps any trigger (the header button or
 * a day cell's "+") and calls `onSelect` with the chosen platform.
 */
export function NewPostMenu({
  children,
  label = "New post",
  onSelect,
  align = "end",
}: {
  children: ReactNode;
  label?: string;
  onSelect: (platform: Platform) => void;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PLATFORMS.map((platform) => (
          <DropdownMenuItem
            key={platform}
            onSelect={() => onSelect(platform)}
            className="gap-2.5"
          >
            <PlatformBadge platform={platform} size={22} />
            {PLATFORM_INFO[platform].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
