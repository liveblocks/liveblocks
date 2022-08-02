import cx from "classnames";
import {
  Root,
  Trigger,
  Portal,
  Content,
  Item,
  Separator,
  DropdownMenuProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
} from "@radix-ui/react-dropdown-menu";
import { forwardRef, ReactNode } from "react";
import styles from "./DropdownMenu.module.css";

export interface Props extends DropdownMenuProps, DropdownMenuContentProps {
  content: DropdownMenuContentProps["children"];
}

export interface ItemProps extends DropdownMenuItemProps {
  label: string;
  icon?: ReactNode;
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
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        modal={modal}
      >
        <Trigger asChild>{children}</Trigger>
        <Portal>
          <Content
            className={cx(className, styles.menu)}
            ref={ref}
            collisionPadding={collisionPadding}
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
        textValue={label}
        ref={ref}
        {...props}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        {label}
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
