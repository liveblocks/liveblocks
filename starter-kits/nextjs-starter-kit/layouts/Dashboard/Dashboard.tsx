import clsx from "clsx";
import { ComponentProps } from "react";
import { DashboardSidebar } from "@/components/Dashboard";
import { DocumentHeader } from "@/components/Document";
import { Group } from "@/types";
import styles from "./Dashboard.module.css";

interface Props extends ComponentProps<"div"> {
  groups: Group[];
}

export function DashboardLayout({
  children,
  groups,
  className,
  ...props
}: Props) {
  return (
    <div className={clsx(className, styles.container)} {...props}>
      <header className={styles.header}>
        <DocumentHeader documentId={null} />
      </header>
      <aside className={styles.aside}>
        <DashboardSidebar groups={groups} />
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
