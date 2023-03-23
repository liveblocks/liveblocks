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
              "text-light-0 bg-dark-300 border-dark-400 dark flex items-center rounded-md border px-2.5 py-1"
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
