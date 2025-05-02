// Tremor Raw Dropdown Menu [v0.0.0]

"use client"

import * as DropdownMenuPrimitives from "@radix-ui/react-dropdown-menu"
import {
  RiArrowRightSLine,
  RiCheckboxBlankCircleLine,
  RiCheckLine,
  RiRadioButtonFill,
} from "@remixicon/react"
import * as React from "react"

import { cx } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitives.Root
DropdownMenu.displayName = "DropdownMenu"

const DropdownMenuTrigger = DropdownMenuPrimitives.Trigger
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuGroup = DropdownMenuPrimitives.Group
DropdownMenuGroup.displayName = "DropdownMenuGroup"

const DropdownMenuSubMenu = DropdownMenuPrimitives.Sub
DropdownMenuSubMenu.displayName = "DropdownMenuSubMenu"

const DropdownMenuRadioGroup = DropdownMenuPrimitives.RadioGroup
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup"

const DropdownMenuSubMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitives.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitives.SubTrigger>
>(({ className, children, ...props }, forwardedRef) => (
  <DropdownMenuPrimitives.SubTrigger
    ref={forwardedRef}
    className={cx(
      // base
      "relative flex cursor-default select-none items-center rounded py-1.5 pl-2 pr-1 outline-none transition-colors data-[state=checked]:font-semibold sm:text-sm",
      // text color
      "text-gray-900 dark:text-gray-50",
      // disabled
      "data-[disabled]:pointer-events-none data-[disabled]:text-gray-400 data-[disabled]:hover:bg-none dark:data-[disabled]:text-gray-600",
      // focus
      "focus-visible:bg-gray-100 data-[state=open]:bg-gray-100 focus-visible:dark:bg-gray-900 data-[state=open]:dark:bg-gray-900",
      // hover
      "hover:bg-gray-100 hover:dark:bg-gray-900",
      //
      className,
    )}
    {...props}
  >
    {children}
    <RiArrowRightSLine
      className="ml-auto size-4 shrink-0 dark:text-gray-500"
      aria-hidden="true"
    />
  </DropdownMenuPrimitives.SubTrigger>
))
DropdownMenuSubMenuTrigger.displayName = "DropdownMenuSubMenuTrigger"

const DropdownMenuSubMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitives.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitives.SubContent>
>(({ className, collisionPadding = 8, ...props }, forwardedRef) => (
  <DropdownMenuPrimitives.Portal>
    <DropdownMenuPrimitives.SubContent
      ref={forwardedRef}
      collisionPadding={collisionPadding}
      className={cx(
        // base
        "relative z-50 overflow-hidden rounded-md border p-1 shadow-xl shadow-black/[2.5%]",
        // widths
        "min-w-32",
        // heights
        "max-h-[var(--radix-popper-available-height)]",
        // background color
        "bg-white dark:bg-[#090E1A]",
        // text color
        "text-gray-900 dark:text-gray-50",
        // border color
        "border-gray-200 dark:border-gray-800",
        // transition
        "will-change-[transform,opacity]",
        // "data-[state=open]:animate-slideDownAndFade",
        "data-[state=closed]:animate-hide",
        "data-[side=bottom]:animate-slideDownAndFade data-[side=left]:animate-slideLeftAndFade data-[side=right]:animate-slideRightAndFade data-[side=top]:animate-slideUpAndFade",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitives.Portal>
))
DropdownMenuSubMenuContent.displayName = "DropdownMenuSubMenuContent"

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitives.Content>
>(
  (
    {
      className,
      sideOffset = 8,
      collisionPadding = 8,
      align = "center",
      loop = true,
      ...props
    },
    forwardedRef,
  ) => (
    <DropdownMenuPrimitives.Portal>
      <DropdownMenuPrimitives.Content
        ref={forwardedRef}
        className={cx(
          // base
          "relative z-50 overflow-hidden rounded-md border p-1 shadow-xl shadow-black/[2.5%]",
          // widths
          "min-w-48",
          // heights
          "max-h-[var(--radix-popper-available-height)]",
          // background color
          "bg-white dark:bg-[#090E1A]",
          // text color
          "text-gray-900 dark:text-gray-50",
          // border color
          "border-gray-200 dark:border-gray-800",
          // transition
          "will-change-[transform,opacity]",
          "data-[state=closed]:animate-hide",
          "data-[side=bottom]:animate-slideDownAndFade data-[side=left]:animate-slideLeftAndFade data-[side=right]:animate-slideRightAndFade data-[side=top]:animate-slideUpAndFade",
          className,
        )}
        sideOffset={sideOffset}
        align={align}
        collisionPadding={collisionPadding}
        loop={loop}
        {...props}
      />
    </DropdownMenuPrimitives.Portal>
  ),
)
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitives.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitives.Item> & {
    shortcut?: string
    hint?: string
  }
>(({ className, shortcut, hint, children, ...props }, forwardedRef) => (
  <DropdownMenuPrimitives.Item
    ref={forwardedRef}
    className={cx(
      // base
      "group/DropdownMenuItem relative flex cursor-pointer select-none items-center rounded py-1.5 pl-2 pr-1 outline-none transition-colors data-[state=checked]:font-semibold sm:text-sm",
      // text color
      "text-gray-900 dark:text-gray-50",
      // disabled
      "data-[disabled]:pointer-events-none data-[disabled]:text-gray-400 data-[disabled]:hover:bg-none dark:data-[disabled]:text-gray-600",
      // focus
      "focus-visible:bg-gray-100 focus-visible:dark:bg-gray-900",
      // hover
      "hover:bg-gray-100 hover:dark:bg-gray-900",
      className,
    )}
    tremor-id="tremor-raw"
    {...props}
  >
    {children}
    {hint && (
      <span
        className={cx("ml-auto pl-2 text-sm text-gray-400 dark:text-gray-600")}
      >
        {hint}
      </span>
    )}
    {shortcut && (
      <span
        className={cx("ml-auto pl-2 text-sm text-gray-400 dark:text-gray-600")}
      >
        {shortcut}
      </span>
    )}
  </DropdownMenuPrimitives.Item>
))
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitives.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitives.CheckboxItem> & {
    shortcut?: string
    hint?: string
  }
>(
  (
    { className, hint, shortcut, children, checked, ...props },
    forwardedRef,
  ) => (
    <DropdownMenuPrimitives.CheckboxItem
      ref={forwardedRef}
      className={cx(
        // base
        "relative flex cursor-pointer select-none items-center gap-x-2 rounded py-1.5 pl-8 pr-1 outline-none transition-colors data-[state=checked]:font-semibold sm:text-sm",
        // text color
        "text-gray-900 dark:text-gray-50",
        // disabled
        "data-[disabled]:pointer-events-none data-[disabled]:text-gray-400 data-[disabled]:hover:bg-none dark:data-[disabled]:text-gray-600",
        // focus
        "focus-visible:bg-gray-100 focus-visible:dark:bg-gray-900",
        // hover
        "hover:bg-gray-100 hover:dark:bg-gray-900",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitives.ItemIndicator>
          <RiCheckLine
            aria-hidden="true"
            className="size-full shrink-0 text-gray-800 dark:text-gray-200"
          />
        </DropdownMenuPrimitives.ItemIndicator>
      </span>
      {children}
      {hint && (
        <span
          className={cx(
            "ml-auto text-sm font-normal text-gray-400 dark:text-gray-600",
          )}
        >
          {hint}
        </span>
      )}
      {shortcut && (
        <span
          className={cx(
            "ml-auto text-sm font-normal tracking-widest text-gray-400 dark:border-gray-800 dark:text-gray-600",
          )}
        >
          {shortcut}
        </span>
      )}
    </DropdownMenuPrimitives.CheckboxItem>
  ),
)
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitives.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitives.RadioItem> & {
    shortcut?: string
    hint?: string
    iconType?: "check" | "radio"
  }
>(
  (
    { className, hint, shortcut, children, iconType = "radio", ...props },
    forwardedRef,
  ) => (
    <DropdownMenuPrimitives.RadioItem
      ref={forwardedRef}
      className={cx(
        // base
        "group/DropdownMenuRadioItem relative flex cursor-pointer select-none items-center gap-x-2 rounded py-1.5 pl-8 pr-1 outline-none transition-colors data-[state=checked]:font-semibold sm:text-sm",
        // text color
        "text-gray-900 dark:text-gray-50",
        // disabled
        "data-[disabled]:pointer-events-none data-[disabled]:text-gray-400 data-[disabled]:hover:bg-none dark:data-[disabled]:text-gray-600",
        // focus
        "focus-visible:bg-gray-100 focus-visible:dark:bg-gray-900",
        // hover
        "hover:bg-gray-100 hover:dark:bg-gray-900",
        className,
      )}
      {...props}
    >
      {iconType === "radio" ? (
        <span className="absolute left-2 flex size-4 items-center justify-center">
          <RiRadioButtonFill
            aria-hidden="true"
            className="size-full shrink-0 text-blue-500 group-data-[state=checked]/DropdownMenuRadioItem:flex group-data-[state=unchecked]/DropdownMenuRadioItem:hidden dark:text-blue-500"
          />
          <RiCheckboxBlankCircleLine
            aria-hidden="true"
            className="size-full shrink-0 text-gray-300 group-data-[state=unchecked]/DropdownMenuRadioItem:flex group-data-[state=checked]/DropdownMenuRadioItem:hidden dark:text-gray-700"
          />
        </span>
      ) : iconType === "check" ? (
        <span className="absolute left-2 flex size-4 items-center justify-center">
          <RiCheckLine
            aria-hidden="true"
            className="size-full shrink-0 text-gray-800 group-data-[state=checked]/DropdownMenuRadioItem:flex group-data-[state=unchecked]/DropdownMenuRadioItem:hidden dark:text-gray-200"
          />
        </span>
      ) : null}
      {children}
      {hint && (
        <span
          className={cx(
            "ml-auto text-sm font-normal text-gray-400 dark:text-gray-600",
          )}
        >
          {hint}
        </span>
      )}
      {shortcut && (
        <span
          className={cx(
            "ml-auto text-sm font-normal tracking-widest text-gray-400 dark:border-gray-800 dark:text-gray-600",
          )}
        >
          {shortcut}
        </span>
      )}
    </DropdownMenuPrimitives.RadioItem>
  ),
)
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitives.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitives.Label>
>(({ className, ...props }, forwardedRef) => (
  <DropdownMenuPrimitives.Label
    ref={forwardedRef}
    className={cx(
      // base
      "px-2 py-2 text-xs font-medium tracking-wide",
      // text color
      "text-gray-500 dark:text-gray-500",
      className,
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitives.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitives.Separator>
>(({ className, ...props }, forwardedRef) => (
  <DropdownMenuPrimitives.Separator
    ref={forwardedRef}
    className={cx(
      "-mx-1 my-1 h-px border-t border-gray-200 dark:border-gray-800",
      className,
    )}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuIconWrapper = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <div
      className={cx(
        // text color
        "text-gray-600 dark:text-gray-400",
        // disabled
        "group-data-[disabled]/DropdownMenuItem:text-gray-400 group-data-[disabled]/DropdownMenuItem:dark:text-gray-700",
        className,
      )}
      {...props}
    />
  )
}
DropdownMenuIconWrapper.displayName = "DropdownMenuIconWrapper"

export {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuIconWrapper, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSubMenu,
  DropdownMenuSubMenuContent, DropdownMenuSubMenuTrigger, DropdownMenuTrigger
}

