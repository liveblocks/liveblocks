import {
  Content,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps,
  type DropdownMenuProps,
  type DropdownMenuSeparatorProps,
  Item,
  Portal,
  Root,
  Separator,
  Trigger,
} from "@radix-ui/react-dropdown-menu";
import cx from "classnames";
import { type ReactNode, forwardRef } from "react";
import styles from "./DropdownMenu.module.css";

export interface Props extends DropdownMenuProps, DropdownMenuContentProps {
  content: DropdownMenuContentProps["children"];
}

export interface ItemProps extends DropdownMenuItemProps {
  icon?: ReactNode;
  label: string;
}

export const DropdownMenu = forwardRef<HTMLDivElement, Props>(
  (
    {
      children,
      content,
      className,
      collisionPadding = 20,
      open,
      defaultOpen,
      onOpenChange,
      modal,
      ...props
    },
    ref
  ) => {
    return (
      <Root
        defaultOpen={defaultOpen}
        modal={modal}
        onOpenChange={onOpenChange}
        open={open}
      >
        <Trigger asChild>{children}</Trigger>
        <Portal>
          <Content
            className={cx(className, styles.menu)}
            collisionPadding={collisionPadding}
            ref={ref}
            {...props}
          >
            {content}
          </Content>
        </Portal>
      </Root>
    );
  }
);

export const DropdownMenuItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ label, icon, children, className, ...props }, ref) => {
    return (
      <Item
        className={cx(className, styles.item)}
        ref={ref}
        textValue={label}
        {...props}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        {label}
        {children}
      </Item>
    );
  }
);

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => {
  return (
    <Separator
      className={cx(className, styles.separator)}
      ref={ref}
      {...props}
    />
  );
});

export {
  Label as DropdownMenuLabel,
  Group as DropdownMenuGroup,
  Item as DropdownMenuCustomItem,
} from "@radix-ui/react-dropdown-menu";
