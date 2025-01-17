"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { forwardRef } from "react";

import { useLiveblocksUIConfig } from "../../config";
import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { useOverrides } from "../../overrides";
import { classNames } from "../../utils/class-names";

export interface DropdownProps
  extends Pick<
      DropdownMenuPrimitive.DropdownMenuProps,
      "defaultOpen" | "open" | "onOpenChange"
    >,
    Pick<DropdownMenuPrimitive.DropdownMenuTriggerProps, "children">,
    Omit<DropdownMenuPrimitive.DropdownMenuContentProps, "content"> {
  content: ReactNode;
}

interface DropdownItemProps
  extends DropdownMenuPrimitive.DropdownMenuItemProps {
  icon?: ReactNode;
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
  const { portalContainer } = useLiveblocksUIConfig();

  return (
    <DropdownMenuPrimitive.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      dir={$.dir}
    >
      {children}
      <DropdownMenuPrimitive.Portal container={portalContainer}>
        <DropdownMenuPrimitive.Content
          className={classNames(
            "lb-root lb-portal lb-elevation lb-dropdown",
            className
          )}
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

export const DropdownItem = forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ children, className, icon, ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.DropdownMenuItem
        className={classNames("lb-dropdown-item", className)}
        {...props}
        ref={forwardedRef}
      >
        {icon ? (
          <span className="lb-dropdown-item-icon lb-icon-container">
            {icon}
          </span>
        ) : null}
        {children ? (
          <span className="lb-dropdown-item-label">{children}</span>
        ) : null}
      </DropdownMenuPrimitive.DropdownMenuItem>
    );
  }
);

export { DropdownMenuTrigger as DropdownTrigger } from "@radix-ui/react-dropdown-menu";
