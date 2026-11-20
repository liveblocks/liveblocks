"use client";

import {
  Dialog as UiDialog,
  DialogBackdrop as UiDialogBackdrop,
  DialogClose as UiDialogClose,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogTitle as UiDialogTitle,
  DialogTrigger as UiDialogTrigger,
} from "@ui-sdk/react/dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = UiDialog;
export const DialogTrigger = UiDialogTrigger;
export const DialogClose = UiDialogClose;

export function DialogBackdrop({
  className,
  ...props
}: ComponentProps<typeof UiDialogBackdrop>) {
  return (
    <UiDialogBackdrop
      className={cn(
        "fixed inset-0 z-50 bg-neutral-950/20 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  ...props
}: ComponentProps<typeof UiDialogContent>) {
  return (
    <UiDialogContent
      className={cn(
        "fixed top-1/2 left-1/2 z-50 flex max-h-[80vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white text-neutral-900 shadow-xl ring-1 ring-neutral-950/10 outline-none transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof UiDialogTitle>) {
  return (
    <UiDialogTitle
      className={cn("text-sm font-semibold text-neutral-900", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof UiDialogDescription>) {
  return (
    <UiDialogDescription
      className={cn("mt-1 text-sm text-neutral-500", className)}
      {...props}
    />
  );
}
