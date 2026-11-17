"use client";

import { EllipsisIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { BrandAvatar, PROJECT_NAME } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  isPlatform,
  PLATFORM_INFO,
  PLATFORMS,
  PlatformBadge,
  PlatformIcon,
  sortPlatforms,
  type Platform,
} from "@/lib/platforms";

type PlatformPickerProps = {
  /** The networks the post goes to; at least one. */
  platforms: Platform[];
  /** The network the composer is currently previewing. */
  preview: Platform;
  onPreviewChange: (platform: Platform) => void;
  onPlatformsChange: (platforms: Platform[]) => void;
};

/**
 * Top left of the composer: one segment per network the post goes to, which
 * switches the preview to look like that network. Clicking the network
 * that's already shown, or the ellipsis, opens the dialog that chooses which
 * networks the draft is published to.
 */
export function PlatformPicker({
  platforms,
  preview,
  onPreviewChange,
  onPlatformsChange,
}: PlatformPickerProps) {
  const [open, setOpen] = useState(false);
  const sorted = sortPlatforms(platforms);

  return (
    <div className="flex items-center gap-1">
      <SegmentedControl
        value={preview}
        onValueChange={(value) => {
          if (isPlatform(value)) {
            onPreviewChange(value);
          }
        }}
        aria-label="Preview as"
      >
        {sorted.map((platform) => (
          <Tooltip key={platform}>
            <TooltipTrigger
              render={
                <SegmentedControlItem
                  value={platform}
                  aria-label={PLATFORM_INFO[platform].label}
                  className="px-2.5 data-checked:text-neutral-900"
                  onClick={() => {
                    if (platform === preview) {
                      setOpen(true);
                    }
                  }}
                />
              }
            >
              <PlatformIcon
                platform={platform}
                width={14}
                height={14}
                style={{ color: PLATFORM_INFO[platform].color }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {platform === preview
                ? "Choose platforms"
                : `Preview on ${PLATFORM_INFO[platform].label}`}
            </TooltipContent>
          </Tooltip>
        ))}
      </SegmentedControl>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-neutral-500"
              aria-label="Choose platforms"
              onClick={() => setOpen(true)}
            />
          }
        >
          <EllipsisIcon />
        </TooltipTrigger>
        <TooltipContent>Choose platforms</TooltipContent>
      </Tooltip>

      <DraftPlatformsDialog
        open={open}
        onOpenChange={setOpen}
        platforms={sorted}
        onPlatformsChange={onPlatformsChange}
      />
    </div>
  );
}

/**
 * "Draft platforms": every network with a switch. The last network left on
 * can't be turned off, since a post has to go somewhere.
 */
function DraftPlatformsDialog({
  open,
  onOpenChange,
  platforms,
  onPlatformsChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: Platform[];
  onPlatformsChange: (platforms: Platform[]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogBackdrop />
      <DialogContent>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-950/5 p-5">
          <div>
            <DialogTitle className="text-base">Draft platforms</DialogTitle>
            <DialogDescription>
              Choose which platforms to publish this draft to.
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-1 text-neutral-500"
                aria-label="Close"
              />
            }
          >
            <XIcon />
          </DialogClose>
        </div>

        <ul className="divide-y divide-neutral-950/5 overflow-y-auto px-5">
          {PLATFORMS.map((platform) => {
            const info = PLATFORM_INFO[platform];
            const checked = platforms.includes(platform);
            const last = checked && platforms.length === 1;
            const id = `draft-platform-${platform}`;
            return (
              <li key={platform} className="flex items-center gap-3 py-2.5">
                <Switch
                  id={id}
                  size="sm"
                  checked={checked}
                  disabled={last}
                  aria-label={`Publish to ${info.label}`}
                  onCheckedChange={(next) =>
                    onPlatformsChange(
                      sortPlatforms(
                        next
                          ? [...platforms, platform]
                          : platforms.filter((p) => p !== platform)
                      )
                    )
                  }
                />
                <label
                  htmlFor={id}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                >
                  <span className="relative shrink-0">
                    <BrandAvatar className="size-8 text-xs" />
                    <PlatformBadge
                      platform={platform}
                      size={16}
                      variant="solid"
                      className="absolute -right-1 -bottom-1 ring-2 ring-white"
                      style={{ borderRadius: 9999 }}
                    />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-semibold text-neutral-900">
                      {PROJECT_NAME}
                    </span>
                    <span className="block truncate text-sm text-neutral-500">
                      {info.handle}
                    </span>
                  </span>
                </label>
                {last ? (
                  <span className="text-xs text-neutral-400">Required</span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="h-2" />
      </DialogContent>
    </Dialog>
  );
}
