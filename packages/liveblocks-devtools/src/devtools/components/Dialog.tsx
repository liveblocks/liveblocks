import * as RadixDialog from "@radix-ui/react-dialog";
import cx from "classnames";
import type { ReactNode } from "react";
import { forwardRef } from "react";

export interface Props
  extends RadixDialog.DialogProps,
    RadixDialog.DialogContentProps {
  content: ReactNode;
}

export const Dialog = forwardRef<HTMLDivElement, Props>(
  (
    {
      className,
      children,
      content,
      modal = true,
      open,
      onOpenChange,
      ...props
    },
    forwardedRef
  ) => (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <RadixDialog.Trigger asChild>{children}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 h-full w-full bg-black/50" />
        <div className="fixed inset-0 flex h-full w-full items-center justify-center p-8">
          <RadixDialog.Content
            className={cx(
              className,
              "bg-light-0 dark:bg-dark-0 dark:border-dark-400 max-h-full w-full max-w-md rounded-md shadow-xl dark:border"
            )}
            ref={forwardedRef}
            {...props}
          >
            {content}
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
);
