import * as TabsPrimitives from "@radix-ui/react-tabs"
import React from "react"

import { cx, focusRing } from "@/lib/utils"

const Tabs = (
  props: Omit<
    React.ComponentPropsWithoutRef<typeof TabsPrimitives.Root>,
    "orientation"
  >,
) => {
  return <TabsPrimitives.Root tremor-id="tremor-raw" {...props} />
}

Tabs.displayName = "Tabs"

type TabsListVariant = "line" | "solid"

const TabsListVariantContext = React.createContext<TabsListVariant>("line")

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitives.List> {
  variant?: TabsListVariant
}

const variantStyles: Record<TabsListVariant, string> = {
  line: cx(
    // base
    "flex items-center justify-start border-b",
    // border color
    "border-neutral-200 dark:border-neutral-800",
  ),
  solid: cx(
    // base
    "inline-flex items-center justify-center rounded-md p-1",
    // border color
    // "border-neutral-200 dark:border-neutral-800",
    // background color
    "bg-neutral-100 dark:bg-neutral-800",
  ),
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.List>,
  TabsListProps
>(({ className, variant = "line", children, ...props }, forwardedRef) => (
  <TabsPrimitives.List
    ref={forwardedRef}
    className={cx(variantStyles[variant], className)}
    {...props}
  >
    <TabsListVariantContext.Provider value={variant}>
      {children}
    </TabsListVariantContext.Provider>
  </TabsPrimitives.List>
))

TabsList.displayName = "TabsList"

function getVariantStyles(tabVariant: TabsListVariant) {
  switch (tabVariant) {
    case "line":
      return cx(
        // base
        "-mb-px items-center justify-center border-b-2 border-transparent px-3 pb-3 text-sm font-medium whitespace-nowrap transition-all",
        // text color
        "text-neutral-500 dark:text-neutral-500",
        // hover
        "hover:text-neutral-700 dark:hover:text-neutral-400",
        // border hover
        "hover:border-neutral-300 dark:hover:border-neutral-400",
        // selected
        "data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900",
        "dark:data-[state=active]:border-neutral-50 dark:data-[state=active]:text-neutral-50",
        // disabled
        "disabled:pointer-events-none",
        "disabled:text-neutral-300 dark:disabled:text-neutral-700",
      )
    case "solid":
      return cx(
        // base
        "inline-flex items-center justify-center rounded-sm px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
        // text color
        "text-neutral-500 dark:text-neutral-400",
        // hover
        "hover:text-neutral-700 dark:hover:text-neutral-200",
        // selected
        "data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm",
        "dark:data-[state=active]:bg-neutral-900 dark:data-[state=active]:text-neutral-50",
        // disabled
        "disabled:pointer-events-none disabled:text-neutral-400 disabled:opacity-50 dark:disabled:text-neutral-600",
      )
  }
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitives.Trigger>
>(({ className, children, ...props }, forwardedRef) => {
  const variant = React.useContext(TabsListVariantContext)
  return (
    <TabsPrimitives.Trigger
      ref={forwardedRef}
      className={cx(getVariantStyles(variant), focusRing, className)}
      {...props}
    >
      {children}
    </TabsPrimitives.Trigger>
  )
})

TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitives.Content>
>(({ className, ...props }, forwardedRef) => (
  <TabsPrimitives.Content
    ref={forwardedRef}
    className={cx("outline-hidden", focusRing, className)}
    {...props}
  />
))

TabsContent.displayName = "TabsContent"

export { Tabs, TabsContent, TabsList, TabsTrigger }
