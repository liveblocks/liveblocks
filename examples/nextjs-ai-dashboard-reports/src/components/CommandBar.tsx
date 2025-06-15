"use client"

import * as Popover from "@radix-ui/react-popover"
import * as React from "react"

import { cx, focusRing } from "@/lib/utils"

const shortcutStyles = cx(
  "hidden h-6 items-center justify-center rounded-md bg-neutral-800 px-2 font-mono text-xs text-neutral-400 ring-1 ring-neutral-700 transition select-none ring-inset sm:flex",
)

interface CommandBarProps extends React.PropsWithChildren {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  disableAutoFocus?: boolean
}

const CommandBar = ({
  open = false,
  onOpenChange,
  defaultOpen = false,
  disableAutoFocus = true,
  children,
}: CommandBarProps) => {
  return (
    <Popover.Root
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
    >
      <Popover.Anchor
        className={cx("fixed inset-x-0 bottom-12 mx-auto w-fit items-center")}
      />
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={0}
          onOpenAutoFocus={(e) => {
            if (disableAutoFocus) {
              e.preventDefault()
            }
          }}
          className={cx(
            "z-50",
            "data-[state=closed]:animate-hide",
            "data-[side=top]:animate-slide-up-and-fade",
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
CommandBar.displayName = "CommandBar"

const CommandBarValue = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cx(
        "px-3 py-2.5 text-sm text-neutral-300 tabular-nums",
        className,
      )}
      {...props}
    />
  )
})
CommandBarValue.displayName = "CommandBar.Value"

const CommandBarBar = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cx(
        "relative flex items-center rounded-lg bg-neutral-900 px-1 shadow-lg shadow-black/30 dark:ring-1 dark:ring-white/10",
        className,
      )}
      {...props}
    />
  )
})
CommandBarBar.displayName = "CommandBarBar"

const CommandBarSeperator = React.forwardRef<
  HTMLDivElement,
  Omit<React.ComponentPropsWithoutRef<"div">, "children">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cx("h-4 w-px bg-neutral-700", className)}
      {...props}
    />
  )
})
CommandBarSeperator.displayName = "CommandBar.Seperator"

interface CommandProps
  extends Omit<
    React.ComponentPropsWithoutRef<"button">,
    "children" | "onClick"
  > {
  action: () => void | Promise<void>
  label: string
  shortcut: { shortcut: string; label?: string }
}

const CommandBarCommand = React.forwardRef<HTMLButtonElement, CommandProps>(
  (
    {
      className,
      type = "button",
      label,
      action,
      shortcut,
      disabled,
      ...props
    }: CommandProps,
    ref,
  ) => {
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === shortcut.shortcut) {
          event.preventDefault()
          event.stopPropagation()
          action()
        }
      }

      if (!disabled) {
        document.addEventListener("keydown", handleKeyDown)
      }

      return () => {
        document.removeEventListener("keydown", handleKeyDown)
      }
    }, [action, shortcut, disabled])

    return (
      <span
        className={cx(
          "flex items-center gap-x-2 rounded-lg bg-neutral-900 p-1 text-base font-medium text-neutral-50 outline-hidden transition focus:z-10 sm:text-sm",
          "sm:last-of-type:-mr-1",
          className,
        )}
      >
        <button
          ref={ref}
          type={type}
          onClick={action}
          disabled={disabled}
          className={cx(
            // base
            "flex items-center gap-x-2 rounded-md px-1 py-1 hover:bg-neutral-800",
            // focus
            "focus-visible:bg-neutral-800 focus-visible:hover:bg-neutral-800",
            "disabled:text-neutral-500",
            focusRing,
          )}
          {...props}
        >
          <span>{label}</span>
          <span className={shortcutStyles}>
            {shortcut.label
              ? shortcut.label.toUpperCase()
              : shortcut.shortcut.toUpperCase()}
          </span>
        </button>
      </span>
    )
  },
)
CommandBarCommand.displayName = "CommandBar.Command"

export {
  CommandBar,
  CommandBarBar,
  CommandBarCommand,
  CommandBarSeperator,
  CommandBarValue,
}
