"use client";

import {
  Avatar as UiAvatar,
  AvatarFallback as UiAvatarFallback,
  AvatarImage as UiAvatarImage,
} from "@ui-sdk/react/avatar";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Avatar({
  className,
  ...props
}: ComponentProps<typeof UiAvatar>) {
  return (
    <UiAvatar
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-neutral-100",
        className
      )}
      {...props}
    />
  );
}

export function AvatarImage({
  className,
  ...props
}: ComponentProps<typeof UiAvatarImage>) {
  return (
    <UiAvatarImage
      className={cn("size-full object-cover", className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  className,
  ...props
}: ComponentProps<typeof UiAvatarFallback>) {
  return (
    <UiAvatarFallback
      className={cn(
        "flex size-full items-center justify-center bg-neutral-200 text-[10px] font-medium text-neutral-700 uppercase",
        className
      )}
      {...props}
    />
  );
}
