import { ClientSideSuspense } from "@liveblocks/react";
import clsx from "clsx";
import Link from "next/link";
import { ComponentProps } from "react";
import { InboxPopover } from "@/components/Inbox";
import { ShareIcon } from "@/icons";
import { renameDocument } from "@/lib/actions";
import { useInitialDocument } from "@/lib/hooks";
import { Button } from "@/primitives/Button";
import { Skeleton } from "@/primitives/Skeleton";
import { Document } from "@/types";
import { Logo } from "../Logo";
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
  const initialDocument = useInitialDocument();

  return (
    <header className={clsx(className, styles.header)} {...props}>
      <div className={styles.logo}>
        <Link href="/" className={styles.logoLink}>
          <Logo />
        </Link>
      </div>
      <div className={styles.document}>
        {showTitle ? (
          <ClientSideSuspense
            fallback={
              <span className={styles.documentNameFallback}>
                {initialDocument.name}
              </span>
            }
          >
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
      <div className={styles.logo}>
        <Link href="/">
          <Logo />
        </Link>
      </div>
      <div className={styles.document}>
        <Skeleton style={{ width: 120 }} />
      </div>
    </header>
  );
}
