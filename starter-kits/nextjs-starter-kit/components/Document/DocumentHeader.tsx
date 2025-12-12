"use client";

import { ClientSideSuspense } from "@liveblocks/react";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { ComponentProps } from "react";
import { OrganizationPopoverContent } from "@/components/Dashboard/OrganizationPopover";
import { InboxPopover } from "@/components/Inbox";
import { ShareIcon } from "@/icons";
import { renameDocument } from "@/lib/actions";
import { Button } from "@/primitives/Button";
import { Popover } from "@/primitives/Popover";
import { Skeleton } from "@/primitives/Skeleton";
import { Document } from "@/types";
import { ShareDialog } from "../ShareDialog";
import { DocumentHeaderAvatars } from "./DocumentHeaderAvatars";
import { DocumentHeaderName } from "./DocumentHeaderName";
import styles from "./DocumentHeader.module.css";

interface Props extends ComponentProps<"header"> {
  documentId: Document["id"];
  showTitle?: boolean;
}

export function DocumentHeader({
  documentId,
  showTitle = true,
  className,
  ...props
}: Props) {
  const { data: session } = useSession();

  return (
    <header className={clsx(className, styles.header)} {...props}>
      <div className={styles.logo}>
        {session && (
          <Popover
            align="start"
            alignOffset={-6}
            content={<OrganizationPopoverContent />}
            side="bottom"
            sideOffset={6}
          >
            <button className={styles.profileButton}>
              <img
                src={session.user.info.avatar}
                alt={session.user.info.name}
                className={styles.profileAvatar}
              />
              <span className={styles.profileButtonName}>
                {session.user.info.name}
              </span>
            </button>
          </Popover>
        )}
      </div>
      <div className={styles.document}>
        {showTitle ? (
          <ClientSideSuspense fallback={null}>
            <DocumentHeaderName
              onDocumentRename={(name) => renameDocument({ documentId, name })}
            />
          </ClientSideSuspense>
        ) : null}
      </div>
      <div className={styles.collaboration}>
        <div className={styles.presence}>
          <ClientSideSuspense fallback={null}>
            <DocumentHeaderAvatars />
          </ClientSideSuspense>
        </div>
        <ClientSideSuspense
          fallback={
            <Button icon={<ShareIcon />} disabled={true}>
              Share
            </Button>
          }
        >
          <ShareDialog>
            <Button icon={<ShareIcon />}>Share</Button>
          </ShareDialog>
        </ClientSideSuspense>

        <InboxPopover align="end" sideOffset={4} />
      </div>
    </header>
  );
}

export function DocumentHeaderSkeleton({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header className={clsx(className, styles.header)} {...props}>
      <div className={styles.logo}></div>
      <div className={styles.document}>
        <Skeleton style={{ width: 120 }} />
      </div>
    </header>
  );
}
