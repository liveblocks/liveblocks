// Tremor Raw Tooltip [v0.0.1]

"use client"

import * as TooltipPrimitives from "@radix-ui/react-tooltip"
import React from "react"

import { cx } from "@/lib/utils"

interface TooltipProps
  extends Omit<TooltipPrimitives.TooltipContentProps, "content" | "onClick">,
    Pick<
      TooltipPrimitives.TooltipProps,
      "open" | "defaultOpen" | "onOpenChange" | "delayDuration"
    > {
  content: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  side?: "bottom" | "left" | "top" | "right"
  showArrow?: boolean
  triggerAsChild?: boolean
}

const Tooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitives.Content>,
  TooltipProps
>(
  (
    {
      children,
      className,
      content,
      delayDuration,
      defaultOpen,
      open,
      onClick,
      onOpenChange,
      showArrow = true,
      side,
      sideOffset = 10,
      triggerAsChild = false,
      ...props
    }: TooltipProps,
    forwardedRef,
  ) => {
    return (
      <TooltipPrimitives.Provider delayDuration={150}>
        <TooltipPrimitives.Root
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          delayDuration={delayDuration}
          tremor-id="tremor-raw"
        >
          <TooltipPrimitives.Trigger onClick={onClick} asChild={triggerAsChild}>
            {children}
          </TooltipPrimitives.Trigger>
          <TooltipPrimitives.Portal>
            <TooltipPrimitives.Content
              ref={forwardedRef}
              side={side}
              sideOffset={sideOffset}
              align="center"
              className={cx(
                // base
                "max-w-60 rounded-md px-2.5 py-1.5 text-sm leading-5 shadow-md select-none",
                // text color
                "text-neutral-50 dark:text-neutral-900",
                // background color
                "bg-neutral-900 dark:bg-neutral-50",
                // transition
                "will-change-[transform,opacity]",
                "data-[side=bottom]:animate-slide-down-and-fade data-[side=left]:animate-slide-left-and-fade data-[side=right]:animate-slide-right-and-fade data-[side=top]:animate-slide-up-and-fade data-[state=closed]:animate-hide",
                className,
              )}
              {...props}
            >
              {content}
              {showArrow ? (
                <TooltipPrimitives.Arrow
                  className="border-none fill-neutral-900 dark:fill-neutral-50"
                  width={12}
                  height={7}
                  aria-hidden="true"
                />
              ) : null}
            </TooltipPrimitives.Content>
          </TooltipPrimitives.Portal>
        </TooltipPrimitives.Root>
      </TooltipPrimitives.Provider>
    )
  },
)

Tooltip.displayName = "Tooltip"

export { Tooltip, type TooltipProps }
