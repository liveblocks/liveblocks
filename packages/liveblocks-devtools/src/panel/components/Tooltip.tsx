import * as RadixTooltip from "@radix-ui/react-tooltip";
import cx from "classnames";
import { type ReactNode, forwardRef } from "react";

export interface Props
  extends RadixTooltip.TooltipProps,
    RadixTooltip.TooltipContentProps {
  content: ReactNode;
}

export const Tooltip = forwardRef<HTMLDivElement, Props>(
  (
    {
      children,
      content,
      open,
      defaultOpen,
      onOpenChange,
      delayDuration,
      disableHoverableContent = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <RadixTooltip.Root
        defaultOpen={defaultOpen}
        delayDuration={delayDuration}
        disableHoverableContent={disableHoverableContent}
        onOpenChange={onOpenChange}
        open={open}
      >
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className={cx(
              className,
              "bg-dark-0 text-light-0 dark:bg-dark-100 dark:border-dark-300 border-dark-0 rounded-lg border px-2.5 py-1"
            )}
            ref={ref}
            collisionPadding={4}
            {...props}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    );
  }
);
