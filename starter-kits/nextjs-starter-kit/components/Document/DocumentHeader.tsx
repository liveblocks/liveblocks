import { ClientSideSuspense } from "@liveblocks/react";
import clsx from "clsx";
import Link from "next/link";
import { ComponentProps } from "react";
import { ShareIcon } from "../../icons";
import { Button } from "../../primitives/Button";
import { Skeleton } from "../../primitives/Skeleton";
import { Document } from "../../types";
import { Logo } from "../Logo";
import { ShareDialog } from "../ShareDialog";
import { DocumentHeaderAvatars } from "./DocumentHeaderAvatars";
import { DocumentHeaderName } from "./DocumentHeaderName";
import styles from "./DocumentHeader.module.css";

interface Props extends ComponentProps<"header"> {
  document: Document;
  onDocumentRename: (name: string) => void;
}

export function DocumentHeader({
  document,
  onDocumentRename,
  className,
  ...props
}: Props) {
  return (
    <header className={clsx(className, styles.header)} {...props}>
      <div className={styles.logo}>
        <Link href="/" className={styles.logoLink}>
          <Logo />
        </Link>
      </div>
      <div className={styles.document}>
        <ClientSideSuspense fallback={null}>
          {() => (
            <DocumentHeaderName
              document={document}
              onDocumentRename={onDocumentRename}
            />
          )}
        </ClientSideSuspense>
      </div>
      <div className={styles.collaboration}>
        <div className={styles.presence}>
          <ClientSideSuspense fallback={null}>
            {() => <DocumentHeaderAvatars />}
          </ClientSideSuspense>
        </div>
        <ShareDialog
          documentAccesses={document.accesses}
          documentId={document.id}
        >
          <Button icon={<ShareIcon />}>Share</Button>
        </ShareDialog>
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
