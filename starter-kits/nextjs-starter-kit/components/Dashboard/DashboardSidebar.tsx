"use client";

import clsx from "clsx";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ComponentProps, useMemo } from "react";
import {
  DASHBOARD_ORGANIZATION_URL,
  DASHBOARD_PRIVATE_URL,
  DASHBOARD_PUBLIC_URL,
  DASHBOARD_URL,
} from "@/constants";
import { EarthIcon, FileIcon, LockIcon } from "@/icons";
import { useCurrentOrganization } from "@/lib/hooks";
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

const ICON_SIZE = 18;

export function DashboardSidebar({ className, ...props }: Props) {
  const { currentOrganization } = useCurrentOrganization();
  return (
    <div className={clsx(className, styles.sidebar)} {...props}>
      <nav className={styles.navigation}>
        <div className={styles.category}>
          <ul className={styles.list}>
            <li>
              <SidebarLink
                href={DASHBOARD_URL}
                icon={<FileIcon width={ICON_SIZE} height={ICON_SIZE} />}
              >
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
        <div className={styles.category}>
          <span className={styles.categoryTitle}>Filter</span>
          <ul className={styles.list}>
            <li>
              <SidebarLink
                href={DASHBOARD_PRIVATE_URL}
                icon={<LockIcon width={ICON_SIZE} height={ICON_SIZE} />}
              >
                Private
              </SidebarLink>
            </li>
            <li>
              {currentOrganization ? (
                <SidebarLink
                  href={DASHBOARD_ORGANIZATION_URL}
                  icon={
                    <Image
                      style={{ borderRadius: "50%" }}
                      src={currentOrganization.avatar}
                      alt={currentOrganization.name}
                      width={ICON_SIZE}
                      height={ICON_SIZE}
                    />
                  }
                >
                  {currentOrganization.name}
                </SidebarLink>
              ) : (
                <SidebarLink
                  href={DASHBOARD_URL}
                  icon={<FileIcon width={ICON_SIZE} height={ICON_SIZE} />}
                >
                  Organization
                </SidebarLink>
              )}
            </li>
            <li>
              <SidebarLink
                href={DASHBOARD_PUBLIC_URL}
                icon={<EarthIcon width={ICON_SIZE} height={ICON_SIZE} />}
              >
                Public
              </SidebarLink>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
