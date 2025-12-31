"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { ComponentProps, useMemo } from "react";
import { DASHBOARD_URL } from "@/constants";
import { FileIcon } from "@/icons";
import { LinkButton } from "@/primitives/Button";
import { normalizeTrailingSlash } from "@/utils";
import styles from "./DashboardSidebar.module.css";

interface Props extends ComponentProps<"div"> {}

interface SidebarLinkProps extends Omit<
  ComponentProps<typeof LinkButton>,
  "href"
> {
  href: string;
}

function SidebarLink({
  href,
  children,
  className,
  ...props
}: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = useMemo(
    () => normalizeTrailingSlash(pathname) === normalizeTrailingSlash(href),
    [pathname, href]
  );

  return (
    <LinkButton
      className={clsx(className, styles.sidebarLink)}
      data-active={isActive || undefined}
      href={href}
      variant="subtle"
      {...props}
    >
      {children}
    </LinkButton>
  );
}

export function DashboardSidebar({ className, ...props }: Props) {
  return (
    <div className={clsx(className, styles.sidebar)} {...props}>
      <nav className={styles.navigation}>
        <div className={styles.category}>
          <ul className={styles.list}>
            <li>
              <SidebarLink href={DASHBOARD_URL} icon={<FileIcon />}>
                All
              </SidebarLink>
            </li>
            {/* TODO private, public, etc 


        <div className={styles.category}>
          <span className={styles.categoryTitle}>Groups</span>
          <ul className={styles.list}>
            {groups.map((group) => {
              return (
                <li key={group.id}>
                  <SidebarLink
                    href={DASHBOARD_GROUP_URL(group.id)}
                    icon={<FolderIcon />}
                  >
                    {group.name}
                  </SidebarLink>
                </li>
              );
            
            */}
          </ul>
        </div>
      </nav>
    </div>
  );
}
