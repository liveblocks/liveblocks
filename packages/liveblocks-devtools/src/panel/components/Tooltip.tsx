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
              "rounded bg-gray-800 px-2.5 py-1 text-white"
            )}
            ref={ref}
            collisionPadding={4}
            {...props}
          >
            {content}
            <RadixTooltip.Arrow height={4} className="fill-gray-800" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    );
  }
);
