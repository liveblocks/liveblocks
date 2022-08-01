import cx from "classnames";
import {
  Root,
  Trigger,
  Portal,
  Content,
  Arrow,
  Item,
  Separator,
  DropdownMenuProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
} from "@radix-ui/react-dropdown-menu";
import { forwardRef, ReactNode } from "react";
import styles from "./DropdownMenu.module.css";

interface Props extends DropdownMenuProps, DropdownMenuContentProps {
  content: DropdownMenuContentProps["children"];
}

interface ItemProps extends DropdownMenuItemProps {
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
            <Arrow width={28} height={7} asChild>
              <svg
                width="28"
                height="7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.arrow}
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9.245 3.99C7.535 2.091 5.063 1 2.462 1h4.416a9.971 9.971 0 0 1 3.11 2.322l2.845 3.163A1.57 1.57 0 0 0 14 7a1.57 1.57 0 0 0 1.167-.515l2.845-3.163A9.972 9.972 0 0 1 21.122 1h4.416c-2.601 0-5.073 1.09-6.783 2.991L15.91 7.154A2.566 2.566 0 0 1 14 8a2.57 2.57 0 0 1-1.911-.845L9.245 3.99Z"
                  className={styles.arrow_outline}
                />
                <path d="M12.833 6.485A1.57 1.57 0 0 0 14 7a1.57 1.57 0 0 0 1.167-.515l2.845-3.163C19.911 1.211 22.654 0 25.538 0H28 0h2.462c2.884 0 5.627 1.211 7.526 3.322l2.845 3.163Z" />
              </svg>
            </Arrow>
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
