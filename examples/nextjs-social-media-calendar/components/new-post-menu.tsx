"use client";

import type { ComponentProps } from "react";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuItemIcon,
  MenuTrigger,
} from "@/components/ui/menu";
import {
  isPlatform,
  PLATFORM_INFO,
  PLATFORMS,
  PlatformBadge,
  type Platform,
} from "@/lib/platforms";

/**
 * A menu listing every platform. `trigger` is the element that opens it
 * (the header button or a day cell's "+"); `onSelect` gets the chosen
 * platform.
 */
export function NewPostMenu({
  trigger,
  label = "New post",
  onSelect,
  align = "end",
}: {
  trigger: NonNullable<ComponentProps<typeof MenuTrigger>["render"]>;
  label?: string;
  onSelect: (platform: Platform) => void;
  align?: "start" | "center" | "end";
}) {
  return (
    <Menu
      onAction={(value) => {
        if (isPlatform(value)) {
          onSelect(value);
        }
      }}
    >
      <MenuTrigger render={trigger} />
      <MenuContent align={align} className="w-48">
        <MenuGroup>
          <MenuGroupLabel>{label}</MenuGroupLabel>
          {PLATFORMS.map((platform) => (
            <MenuItem key={platform} value={platform}>
              <MenuItemIcon>
                <PlatformBadge platform={platform} size={22} />
              </MenuItemIcon>
              {PLATFORM_INFO[platform].label}
            </MenuItem>
          ))}
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}
