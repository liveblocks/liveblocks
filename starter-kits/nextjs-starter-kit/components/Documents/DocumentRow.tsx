import { RoomUser } from "@liveblocks/node";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DOCUMENT_URL } from "@/constants";
import { DeleteIcon, MoreIcon } from "@/icons";
import { useGroupsInfo } from "@/lib/hooks";
import { getDocumentAccess } from "@/lib/utils";
import { UserInfo } from "@/liveblocks.config";
import { AvatarStack } from "@/primitives/AvatarStack";
import { Button } from "@/primitives/Button";
import { Popover } from "@/primitives/Popover";
import { Skeleton } from "@/primitives/Skeleton";
import { Document, DocumentAccess } from "@/types";
import { DocumentDeleteDialog } from "./DocumentDeleteDialog";
import { DocumentIcon } from "./DocumentIcon";
import styles from "./DocumentRow.module.css";

interface Props extends ComponentProps<"div"> {
  document: Document;
  others?: RoomUser<UserInfo>[];
  revalidateDocuments: () => void;
}

export function DocumentRow({
  className,
  document,
  others,
  revalidateDocuments,
  ...props
}: Props) {
  const groupIds = useMemo(
    () => Object.keys(document.accesses.groups),
    [document]
  );
  const groups = useGroupsInfo(groupIds);

  const { data: session } = useSession();
  const [currentUserAccess, setCurrentUserAccess] = useState(
    DocumentAccess.NONE
  );

  // Check if current user has access to edit the room
  useEffect(() => {
    if (!session) {
      return;
    }

    const access = getDocumentAccess({
      documentAccesses: document.accesses,
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
    });
    setCurrentUserAccess(access);
  }, [session, document]);

  const [isMoreOpen, setMoreOpen] = useState(false);

  const date = new Date(document.lastConnection);
  const url = DOCUMENT_URL(document.type, document.id);

  const handleDeleteDialogOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setMoreOpen(false);
    }
  }, []);

  return (
    <div className={clsx(className, styles.row)} {...props}>
      <Link className={clsx(styles.container, styles.link)} href={url}>
        <div className={styles.icon}>
          <DocumentIcon type={document.type} />
        </div>
        <div className={styles.info}>
          <span className={styles.documentName}>
            <span>{document.name}</span>
            {groups.length > 0 ? (
              <span className={styles.groups}>
                {groups.map((group) => (
                  <span key={group.id} className={styles.group}>
                    {group.name}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
          <span className={styles.documentDate}>
            Edited {formatDistanceToNow(date)} ago
          </span>
        </div>
        {others && (
          <div className={styles.presence}>
            <AvatarStack
              avatars={others.map((other) => ({
                name: other.info.name,
                src: other.info.avatar,
                color: other.info.color,
              }))}
              size={20}
              tooltip
            />
          </div>
        )}
      </Link>
      {currentUserAccess === DocumentAccess.FULL ? (
        <div className={styles.more}>
          <Popover
            align="end"
            content={
              <div className={styles.morePopover}>
                <DocumentDeleteDialog
                  documentId={document.id}
                  onDeleteDocument={revalidateDocuments}
                  onOpenChange={handleDeleteDialogOpenChange}
                >
                  <Button icon={<DeleteIcon />} variant="subtle">
                    Delete
                  </Button>
                </DocumentDeleteDialog>
              </div>
            }
            modal
            onOpenChange={setMoreOpen}
            open={isMoreOpen}
            side="bottom"
            sideOffset={10}
            {...props}
          >
            <Button
              className={styles.moreButton}
              icon={<MoreIcon />}
              variant="secondary"
            />
          </Popover>
        </div>
      ) : null}
    </div>
  );
}

export function DocumentRowSkeleton({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={clsx(className, styles.row)} {...props}>
      <div className={styles.container}>
        <div className={styles.icon}>
          <Skeleton style={{ width: 20, height: 20 }} />
        </div>
        <div className={clsx(styles.info, styles.infoSkeleton)}>
          <span className={styles.documentName}>
            <Skeleton style={{ width: 100 }} />
          </span>
          <span className={styles.documentDate}>
            <Skeleton style={{ width: 160 }} />
          </span>
        </div>
      </div>
    </div>
  );
}
