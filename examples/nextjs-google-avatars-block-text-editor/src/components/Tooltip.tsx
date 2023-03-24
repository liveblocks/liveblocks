import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ComponentProps, ReactElement, ReactNode } from "react";
import styles from "./Tooltip.module.css";

type TooltipProps = ComponentProps<typeof TooltipPrimitive.Root> &
  ComponentProps<typeof TooltipPrimitive.Content> & {
    children: ReactElement;
    content: ReactNode;
  };

export default function Tooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  side = "top",
  align = "center",
  delayDuration,
  ...props
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={styles.tooltip}
          side={side}
          align={align}
          sideOffset={4}
          {...props}
        >
          {content}

          <TooltipPrimitive.Arrow
            offset={8}
            width={11}
            height={5}
            style={{
              fill: "rgba(var(--color-foreground), 0.92)",
            }}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
