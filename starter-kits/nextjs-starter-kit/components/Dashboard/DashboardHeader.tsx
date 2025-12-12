"use client";

import clsx from "clsx";
import { useSession } from "next-auth/react";
import { ComponentProps, MouseEventHandler } from "react";
import { Avatar } from "@/primitives/Avatar";
import { Popover } from "@/primitives/Popover";
import { InboxPopover } from "../Inbox";
import { DashboardHeaderMenu } from "./DashboardHeaderMenu";
import { OrganizationPopoverContent } from "./OrganizationPopover";
import styles from "./DashboardHeader.module.css";

interface Props extends ComponentProps<"header"> {
  isOpen: boolean;
  onMenuClick: MouseEventHandler<HTMLButtonElement>;
}

export function DashboardHeader({
  isOpen,
  onMenuClick,
  className,
  ...props
}: Props) {
  const { data: session } = useSession();

  return (
    <header className={clsx(className, styles.header)} {...props}>
      <div className={styles.left}>
        <DashboardHeaderMenu isOpen={isOpen} onMenuClick={onMenuClick} />
        {session && (
          <Popover
            align="start"
            alignOffset={-6}
            content={<OrganizationPopoverContent />}
            side="bottom"
            sideOffset={6}
          >
            <button className={styles.profileButton}>
              <Avatar
                className={styles.profileAvatar}
                name={session.user.info.name}
                size={32}
                src={session.user.info.avatar}
              />
              <span className={styles.profileButtonName}>
                {session.user.info.name}
              </span>
            </button>
          </Popover>
        )}
      </div>
      <div className={styles.profile}>
        <div className={styles.profileInbox}>
          <InboxPopover align="end" sideOffset={4} />
        </div>
      </div>
    </header>
  );
}
