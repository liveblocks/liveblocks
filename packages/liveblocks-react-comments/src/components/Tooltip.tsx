import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import React from "react";

import { classNames } from "../utils/class-names";

interface TooltipProps
  extends Pick<TooltipPrimitive.TooltipTriggerProps, "children">,
    TooltipPrimitive.TooltipContentProps {
  content: ReactNode;
  shortcut?: ReactNode;
}

export function Tooltip({
  children,
  content,
  shortcut,
  className,
  ...props
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root disableHoverableContent>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={classNames("lb-root lb-tooltip", className)}
          side="top"
          align="center"
          // TODO: Share these values between all floating elements
          sideOffset={6}
          collisionPadding={10}
          {...props}
        >
          {content}
          {shortcut && <span className="lb-tooltip-shortcut">{shortcut}</span>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { TooltipProvider } from "@radix-ui/react-tooltip";
