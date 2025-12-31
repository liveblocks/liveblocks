"use client";

import {
  ClientSideSuspense,
  useIsInsideRoom,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { ComponentProps } from "react";
import { InboxPopover } from "@/components/Inbox";
import { OrganizationPopover } from "@/components/OrganizationPopover";
import { ShareIcon, SignInIcon } from "@/icons";
import { renameDocument, signIn } from "@/lib/actions";
import { Button } from "@/primitives/Button";
import { Skeleton } from "@/primitives/Skeleton";
import { Document } from "@/types";
import { ShareDialog } from "../ShareDialog";
import { DocumentHeaderAvatars } from "./DocumentHeaderAvatars";
import { DocumentHeaderName } from "./DocumentHeaderName";
import styles from "./DocumentHeader.module.css";

interface Props extends ComponentProps<"header"> {
  documentId: Document["id"] | null;
  showTitle?: boolean;
}

export function DocumentHeader({
  documentId,
  showTitle = true,
  className,
  ...props
}: Props) {
  const isInsideRoom = useIsInsideRoom();
  const { status } = useSession();

  return (
    <header className={clsx(className, styles.header)} {...props}>
      <div className={styles.logo}>
        {status === "authenticated" ? (
          <OrganizationPopover />
        ) : (
          <Button
            icon={<SignInIcon />}
            variant="secondary"
            onClick={() => signIn()}
          >
            Sign in
          </Button>
        )}
      </div>
      <div className={styles.document}>
        {showTitle ? (
          <ClientSideSuspense fallback={null}>
            {isInsideRoom && documentId ? (
              <DocumentHeaderName
                onDocumentRename={(name) =>
                  renameDocument({ documentId, name })
                }
              />
            ) : null}
          </ClientSideSuspense>
        ) : null}
      </div>
      <div className={styles.collaboration}>
        <div className={styles.presence}>
          <ClientSideSuspense fallback={null}>
            {isInsideRoom ? <DocumentHeaderAvatars /> : null}
          </ClientSideSuspense>
        </div>
        <ClientSideSuspense fallback={null}>
          {isInsideRoom ? (
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
          ) : null}
        </ClientSideSuspense>
        {status === "authenticated" ? (
          <InboxPopover align="end" sideOffset={4} />
        ) : null}
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
