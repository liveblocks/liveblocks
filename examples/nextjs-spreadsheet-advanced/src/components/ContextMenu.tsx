import cx from "classnames";
import {
  Root,
  Trigger,
  Portal,
  Content,
  Item,
  Separator,
  ContextMenuTriggerProps,
  ContextMenuContentProps,
  ContextMenuItemProps,
  ContextMenuSeparatorProps,
} from "@radix-ui/react-context-menu";
import { ReactNode } from "react";
import styles from "./ContextMenu.module.css";

interface Props extends ContextMenuTriggerProps {
  content: ContextMenuContentProps["children"];
}

interface ItemProps extends ContextMenuItemProps {
  label: string;
  icon?: ReactNode;
}

export function ContextMenu({ children, content, ...props }: Props) {
  return (
    <Root>
      <Trigger {...props}>{children}</Trigger>
      <Portal>
        <Content className={styles.menu}>{content}</Content>
      </Portal>
    </Root>
  );
}

export function ContextMenuItem({
  label,
  icon,
  children,
  className,
  ...props
}: ItemProps) {
  return (
    <Item className={cx(className, styles.item)} textValue={label} {...props}>
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </Item>
  );
}

export function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuSeparatorProps) {
  return <Separator className={cx(className, styles.separator)} {...props} />;
}

export {
  Label as ContextMenuLabel,
  Group as ContextMenuGroup,
  Item as ContextMenuCustomItem,
} from "@radix-ui/react-context-menu";
