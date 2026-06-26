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
import { Skeleton } from "@/primitives/Skeleton";
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
  const { currentOrganization, isLoading } = useCurrentOrganization();
  return (
    <div className={clsx(className, styles.sidebar)} {...props}>
      <nav className={styles.navigation}>
        <div className={styles.category}>
          <SidebarLink
            href={DASHBOARD_URL}
            icon={<FileIcon width={ICON_SIZE} height={ICON_SIZE} />}
          >
            All
          </SidebarLink>
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
              {isLoading ? (
                <SidebarLink
                  href={DASHBOARD_ORGANIZATION_URL}
                  icon={
                    <Skeleton style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                  }
                >
                  <Skeleton style={{ width: 96 }} />
                </SidebarLink>
              ) : currentOrganization ? (
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

export function DashboardSidebarSkeleton({ className, ...props }: Props) {
  return (
    <div className={clsx(className, styles.sidebar)} {...props}>
      <nav className={styles.navigation}>
        <div className={styles.category}>
          <Skeleton style={{ width: 88, height: 36 }} />
        </div>
        <div className={styles.category}>
          <span className={styles.categoryTitle}>Filter</span>
          <ul className={styles.list}>
            <li>
              <Skeleton style={{ width: 116, height: 36 }} />
            </li>
            <li>
              <Skeleton style={{ width: 148, height: 36 }} />
            </li>
            <li>
              <Skeleton style={{ width: 112, height: 36 }} />
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
