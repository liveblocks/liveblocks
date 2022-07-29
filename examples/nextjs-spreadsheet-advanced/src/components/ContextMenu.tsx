import cx from "classnames";
import {
  Root,
  Trigger,
  Portal,
  Content,
  Item,
  Separator,
  ContextMenuContentProps,
  ContextMenuItemProps,
  ContextMenuSeparatorProps,
} from "@radix-ui/react-context-menu";
import { ReactNode } from "react";
import styles from "./ContextMenu.module.css";

interface Props extends ContextMenuContentProps {
  content: ContextMenuContentProps["children"];
}

interface ItemProps extends ContextMenuItemProps {
  label: string;
  icon?: ReactNode;
}

export function ContextMenu({ children, content, className, ...props }: Props) {
  return (
    <Root>
      <Trigger asChild>{children}</Trigger>
      <Portal>
        <Content className={cx(className, styles.menu)} {...props}>
          {content}
        </Content>
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
      {icon && <span className={styles.icon}>{icon}</span>}
      {label}
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
