// Tremor Raw Popover [v0.0.2]

import * as PopoverPrimitives from "@radix-ui/react-popover"
import React from "react"

import { cx } from "@/lib/utils"

const Popover = (
  props: React.ComponentPropsWithoutRef<typeof PopoverPrimitives.Root>,
) => {
  return <PopoverPrimitives.Root {...props} />
}

Popover.displayName = "Popover"

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitives.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitives.Trigger>
>((props, forwardedRef) => {
  return <PopoverPrimitives.Trigger ref={forwardedRef} {...props} />
})

PopoverTrigger.displayName = "PopoverTrigger"

const PopoverAnchor = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitives.Anchor>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitives.Anchor>
>((props, forwardedRef) => {
  return <PopoverPrimitives.Anchor ref={forwardedRef} {...props} />
})

PopoverAnchor.displayName = "PopoverAnchor"

const PopoverClose = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitives.Close>
>((props, forwardedRef) => {
  return <PopoverPrimitives.Close ref={forwardedRef} {...props} />
})

PopoverClose.displayName = "PopoverClose"

interface ContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitives.Content> {}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitives.Content>,
  ContentProps
>(
  (
    {
      className,
      sideOffset = 10,
      side = "bottom",
      align = "center",
      collisionPadding,
      avoidCollisions = true,
      ...props
    }: ContentProps,
    forwardedRef,
  ) => {
    return (
      <PopoverPrimitives.Portal>
        <PopoverPrimitives.Content
          ref={forwardedRef}
          sideOffset={sideOffset}
          side={side}
          align={align}
          collisionPadding={collisionPadding}
          avoidCollisions={avoidCollisions}
          className={cx(
            // base
            "max-h-(--radix-popper-available-height) min-w-60 overflow-hidden rounded-md border p-2.5 text-sm shadow-md",
            // border color
            "border-neutral-200 dark:border-neutral-800",
            // text color
            "text-neutral-900 dark:text-neutral-50",
            // background color
            "bg-white dark:bg-neutral-950",
            // transition
            "will-change-[transform,opacity]",
            "data-[state=closed]:animate-hide",
            "data-[state=open]:data-[side=bottom]:animate-slide-down-and-fade data-[state=open]:data-[side=left]:animate-slide-left-and-fade data-[state=open]:data-[side=right]:animate-slide-right-and-fade data-[state=open]:data-[side=top]:animate-slide-up-and-fade",

            className,
          )}
          // https://github.com/radix-ui/primitives/issues/1159
          tremor-id="tremor-raw"
          onWheel={(event) => {
            event.stopPropagation()
            const isScrollingDown = event.deltaY > 0
            if (isScrollingDown) {
              event.currentTarget.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowDown" }),
              )
            } else {
              event.currentTarget.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowUp" }),
              )
            }
          }}
          {...props}
        />
      </PopoverPrimitives.Portal>
    )
  },
)
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverTrigger }
