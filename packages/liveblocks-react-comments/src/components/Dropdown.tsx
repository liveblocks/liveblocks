import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import React from "react";

import { classNames } from "../utils/class-names";

interface DropdownProps
  extends Pick<
      DropdownMenuPrimitive.DropdownMenuProps,
      "defaultOpen" | "open" | "onOpenChange"
    >,
    Pick<DropdownMenuPrimitive.DropdownMenuTriggerProps, "children">,
    DropdownMenuPrimitive.DropdownMenuContentProps {
  content: ReactNode;
}

export function Dropdown({
  children,
  content,
  defaultOpen,
  open,
  onOpenChange,
  className,
  ...props
}: DropdownProps) {
  return (
    <DropdownMenuPrimitive.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={classNames("lb-dropdown", className)}
          // TODO: Share these values between all floating elements
          collisionPadding={10}
          {...props}
        >
          {content}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

export {
  DropdownMenuItem as DropdownItem,
  DropdownMenuTrigger as DropdownTrigger,
} from "@radix-ui/react-dropdown-menu";
