import * as RadixDialog from "@radix-ui/react-dialog";
import { ReactNode } from "react";
import { CrossIcon } from "@/icons";
import { Button } from "../Button";
import styles from "./Dialog.module.css";

interface Props extends RadixDialog.DialogProps {
  title: string;
  titleButton?: ReactNode;
  content: ReactNode;
}

export function Dialog({
  title,
  titleButton,
  content,
  children,
  modal = true,
  ...props
}: Props) {
  return (
    <RadixDialog.Root modal={modal} {...props}>
      <RadixDialog.Trigger asChild>{children}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay}>
          <RadixDialog.Content className={styles.dialog}>
            <div className={styles.header}>
              <RadixDialog.Title className={styles.title}>
                {title}
              </RadixDialog.Title>
              <div className={styles.titleButtons}>
                {titleButton}
                <RadixDialog.Close asChild>
                  <Button
                    icon={<CrossIcon />}
                    className={styles.closeButton}
                    variant="subtle"
                  />
                </RadixDialog.Close>
              </div>
            </div>
            <div className={styles.content}>{content}</div>
          </RadixDialog.Content>
        </RadixDialog.Overlay>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
