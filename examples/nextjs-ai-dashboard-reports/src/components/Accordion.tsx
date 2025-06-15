// Tremor Raw Accordion [v0.0.0]

import * as AccordionPrimitives from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import React from "react"

import { cx } from "@/lib/utils"

const Accordion = AccordionPrimitives.Root

Accordion.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitives.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitives.Trigger>
>(({ className, children, ...props }, forwardedRef) => (
  <AccordionPrimitives.Header className="flex">
    <AccordionPrimitives.Trigger
      className={cx(
        // base
        "group flex flex-1 cursor-pointer items-center justify-between py-3 text-left text-sm leading-none font-medium",
        // text color
        "text-neutral-900 dark:text-neutral-50",
        // disabled
        "data-disabled:cursor-default data-disabled:text-neutral-400 dark:data-disabled:text-neutral-600",
        //focus
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden focus-visible:ring-inset",
        className,
      )}
      {...props}
      ref={forwardedRef}
    >
      {children}
      <ChevronDown
        className={cx(
          // base
          "size-5 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180",
          // text color
          "text-neutral-400 dark:text-neutral-600",
          // disabled
          "group-data-disabled:text-neutral-300 dark:group-data-disabled:text-neutral-700",
        )}
        aria-hidden="true"
        focusable="false"
      />
    </AccordionPrimitives.Trigger>
  </AccordionPrimitives.Header>
))

AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitives.Content>
>(({ className, children, ...props }, forwardedRef) => (
  <AccordionPrimitives.Content
    ref={forwardedRef}
    className={cx(
      "data-[state=closed]:animate-accordion-close data-[state=open]:animate-accordion-open transform-gpu",
    )}
    {...props}
  >
    <div
      className={cx(
        // base
        "overflow-hidden pb-4 text-sm",
        // text color
        "text-neutral-700 dark:text-neutral-200",
        className,
      )}
    >
      {children}
    </div>
  </AccordionPrimitives.Content>
))

AccordionContent.displayName = "AccordionContent"

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitives.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitives.Item>
>(({ className, ...props }, forwardedRef) => (
  <AccordionPrimitives.Item
    ref={forwardedRef}
    className={cx(
      // base
      "overflow-hidden border-b first:mt-0",
      // border color
      "border-neutral-200 dark:border-neutral-800",
      className,
    )}
    tremor-id="tremor-raw"
    {...props}
  />
))

AccordionItem.displayName = "AccordionItem"

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
