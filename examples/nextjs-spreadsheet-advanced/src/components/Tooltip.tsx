import cx from "classnames";
import {
  Root,
  Trigger,
  Portal,
  Content,
  Arrow,
  TooltipProps,
  TooltipContentProps,
} from "@radix-ui/react-tooltip";
import { forwardRef, ReactNode } from "react";
import styles from "./Tooltip.module.css";

interface Props extends TooltipProps, TooltipContentProps {
  content: ReactNode;
}

export const Tooltip = forwardRef<HTMLDivElement, Props>(
  (
    {
      children,
      content,
      open,
      defaultOpen,
      onOpenChange,
      delayDuration,
      disableHoverableContent = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        delayDuration={delayDuration}
        disableHoverableContent={disableHoverableContent}
      >
        <Trigger asChild>{children}</Trigger>
        <Portal>
          <Content
            className={cx(className, styles.tooltip)}
            sideOffset={4}
            ref={ref}
            {...props}
          >
            {content}
            <Arrow width={28} height={7} asChild>
              <svg
                width="28"
                height="7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.arrow}
              >
                <path d="M12.833 6.485A1.57 1.57 0 0 0 14 7a1.57 1.57 0 0 0 1.167-.515l2.845-3.163C19.911 1.211 22.654 0 25.538 0H28 0h2.462c2.884 0 5.627 1.211 7.526 3.322l2.845 3.163Z" />
              </svg>
            </Arrow>
          </Content>
        </Portal>
      </Root>
    );
  }
);
