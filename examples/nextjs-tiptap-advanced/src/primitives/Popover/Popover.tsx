import * as RadixPopover from "@radix-ui/react-popover";
import { CSSProperties, ReactNode } from "react";
import styles from "./Popover.module.css";

interface Props
  extends RadixPopover.PopoverProps,
    Pick<
      RadixPopover.PopoverContentProps,
      "side" | "sideOffset" | "align" | "alignOffset"
    > {
  content: ReactNode;
  aboveOverlay?: boolean;
}

export function Popover({
  content,
  children,
  side,
  sideOffset,
  align,
  alignOffset,
  aboveOverlay,
  ...props
}: Props) {
  return (
    <RadixPopover.Root {...props}>
      <RadixPopover.Trigger asChild>{children}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          className={styles.popover}
          collisionPadding={10}
          side={side}
          sideOffset={sideOffset}
          align={align}
          alignOffset={alignOffset}
          style={
            {
              zIndex: aboveOverlay ? "var(--z-overlay)" : undefined,
            } as CSSProperties
          }
        >
          {content}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
