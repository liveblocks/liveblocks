import { ComponentProps, forwardRef, ReactNode } from "react";
import clsx from "clsx";
import styles from "./Document.module.css";

interface Props extends ComponentProps<"div"> {
  header: ReactNode;
}

export const DocumentLayout = forwardRef<HTMLElement, Props>(
  ({ children, header, className, ...props }, ref) => {
    return (
      <div className={clsx(className, styles.container)} {...props}>
        <header className={styles.header}>{header}</header>
        <main className={styles.main} ref={ref}>
          {children}
        </main>
      </div>
    );
  }
);
