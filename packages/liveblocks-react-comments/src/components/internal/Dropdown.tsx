"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import React from "react";

import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { useOverrides } from "../../overrides";
import { classNames } from "../../utils/class-names";

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
  const $ = useOverrides();

  return (
    <DropdownMenuPrimitive.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      dir={$.dir}
    >
      {children}
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={classNames("lb-root lb-elevation lb-dropdown", className)}
          sideOffset={FLOATING_ELEMENT_SIDE_OFFSET}
          collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
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
