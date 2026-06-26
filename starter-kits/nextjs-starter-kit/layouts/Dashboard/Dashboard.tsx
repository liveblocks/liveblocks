import clsx from "clsx";
import { ComponentProps } from "react";
import {
  DashboardSidebar,
  DashboardSidebarSkeleton,
} from "@/components/Dashboard";
import { DocumentsListSkeleton } from "@/components/DocumentsList";
import { Header, HeaderSkeleton } from "@/components/Header";
import styles from "./Dashboard.module.css";

interface Props extends ComponentProps<"div"> {}

export function DashboardLayout({ children, className, ...props }: Props) {
  return (
    <div className={clsx(className, styles.container)} {...props}>
      <header className={styles.header}>
        <Header documentId={null} />
      </header>
      <aside className={styles.aside}>
        <DashboardSidebar />
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

export function DashboardLayoutSkeleton({
  className,
  ...props
}: Omit<Props, "children">) {
  return (
    <div className={clsx(className, styles.container)} {...props}>
      <header className={styles.header}>
        <HeaderSkeleton />
      </header>
      <aside className={styles.aside}>
        <DashboardSidebarSkeleton />
      </aside>
      <main className={styles.main}>
        <DocumentsListSkeleton />
      </main>
    </div>
  );
}
