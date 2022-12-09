import * as Tabs from "@radix-ui/react-tabs";
import { useRouter } from "next/router";
import { ComponentProps, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserIcon, UsersIcon } from "../../icons";
import {
  getDocument,
  getDocumentGroups,
  getDocumentUsers,
  useDocumentsFunctionSWR,
  getDocumentAccess,
} from "../../lib/client";
import { useBroadcastEvent, useEventListener } from "../../liveblocks.config";
import { Dialog } from "../../primitives/Dialog";
import { DocumentAccess, DocumentAccesses } from "../../types";
import { ShareDialogDefault } from "./ShareDialogDefault";
import { ShareDialogInviteGroup } from "./ShareDialogInviteGroup";
import { ShareDialogInviteUser } from "./ShareDialogInviteUser";
import { ShareDialogUsers } from "./ShareDialogUsers";
import { ShareDialogGroups } from "./ShareDialogGroups";
import styles from "./ShareDialog.module.css";

interface Props
  extends Omit<ComponentProps<typeof Dialog>, "content" | "title"> {
  documentAccesses: DocumentAccesses;
  documentId: string;
}

export function ShareDialog({
  children,
  documentId,
  documentAccesses,
  ...props
}: Props) {
  const router = useRouter();

  const { data: session } = useSession();
  const [currentUserAccess, setCurrentUserAccess] = useState(
    DocumentAccess.NONE
  );

  // Get a list of users attached to the document (+ their info)
  const {
    data: users,
    error: usersError,
    mutate: revalidateUsers,
  } = useDocumentsFunctionSWR([getDocumentUsers, { documentId }], {
    refreshInterval: 0,
  });

  // Get a list of groups attached to the document (+ their info)
  const {
    data: groups,
    error: groupsError,
    mutate: revalidateGroups,
  } = useDocumentsFunctionSWR([getDocumentGroups, { documentId }], {
    refreshInterval: 0,
  });

  // Get the current document
  const {
    data: document,
    error: defaultAccessError,
    mutate: revalidateDefaultAccess,
  } = useDocumentsFunctionSWR([getDocument, { documentId }], {
    refreshInterval: 0,
  });

  // Get default access value from document, or the default value from the property
  const defaultAccess = document
    ? document.accesses.default
    : documentAccesses.default;

  // If you have no access to this room, refresh
  if (defaultAccessError && defaultAccessError.code === 403) {
    router.reload();
  }

  // Refresh the current user's access level
  const revalidateCurrentUserAccess = useCallback(() => {
    if (!session || !document) {
      return;
    }

    const accessLevel = getDocumentAccess({
      documentAccesses: document.accesses,
      userId: session.user?.info.id,
      groupIds: session.user?.info.groupIds,
    });

    // Reload if current user has no access (will show error page)
    if (accessLevel === DocumentAccess.NONE) {
      router.reload();
      return;
    }

    // Reload app if current user swapping between READONLY and EDIT/FULL (will reconnect to app with new access level)
    const accessChanges = new Set([currentUserAccess, accessLevel]);
    if (
      accessChanges.has(DocumentAccess.READONLY) &&
      (accessChanges.has(DocumentAccess.EDIT) ||
        accessChanges.has(DocumentAccess.FULL))
    ) {
      router.reload();
      return;
    }

    setCurrentUserAccess(accessLevel);
  }, [document, session, currentUserAccess, router]);

  useEffect(() => {
    revalidateCurrentUserAccess();
  }, [document, revalidateCurrentUserAccess, session]);

  // Revalidate all access data
  function revalidateAll() {
    revalidateUsers();
    revalidateGroups();
    revalidateDefaultAccess();
    revalidateCurrentUserAccess();
  }

  // Broadcasts are used for sending share dialog updates below
  const broadcast = useBroadcastEvent();

  // If a share dialog update has been received, refresh data
  useEventListener(({ event }) => {
    if (event.type === "SHARE_DIALOG_UPDATE") {
      revalidateAll();
    }
  });

  return (
    <Dialog
      content={
        <div className={styles.dialog}>
          <Tabs.Root className={styles.dialogTabs} defaultValue="users">
            <Tabs.List className={styles.dialogTabList}>
              <Tabs.Trigger className={styles.dialogTab} value="users">
                <span className={styles.dialogTabLabel}>
                  <UserIcon className={styles.dialogTabIcon} />
                  <span>Users</span>
                </span>
              </Tabs.Trigger>
              <Tabs.Trigger className={styles.dialogTab} value="groups">
                <span className={styles.dialogTabLabel}>
                  <UsersIcon className={styles.dialogTabIcon} />
                  <span>Groups</span>
                </span>
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="users" className={styles.dialogTabContent}>
              <ShareDialogInviteUser
                className={styles.dialogSection}
                documentId={documentId}
                fullAccess={currentUserAccess === DocumentAccess.FULL}
                onSetUsers={() => {
                  revalidateAll();
                  broadcast({ type: "SHARE_DIALOG_UPDATE" });
                }}
              />
              {users?.length ? (
                <ShareDialogUsers
                  className={styles.dialogSection}
                  documentId={documentId}
                  documentOwner={document?.owner || ""}
                  fullAccess={currentUserAccess === DocumentAccess.FULL}
                  onSetUsers={() => {
                    revalidateAll();
                    broadcast({ type: "SHARE_DIALOG_UPDATE" });
                  }}
                  users={users}
                />
              ) : null}
            </Tabs.Content>
            <Tabs.Content value="groups" className={styles.dialogTabContent}>
              <ShareDialogInviteGroup
                className={styles.dialogSection}
                documentId={documentId}
                fullAccess={currentUserAccess === DocumentAccess.FULL}
                currentGroups={groups || []}
                onSetGroups={() => {
                  revalidateAll();
                  broadcast({ type: "SHARE_DIALOG_UPDATE" });
                }}
              />
              {groups?.length ? (
                <ShareDialogGroups
                  className={styles.dialogSection}
                  documentId={documentId}
                  fullAccess={currentUserAccess === DocumentAccess.FULL}
                  groups={groups}
                  onSetGroups={() => {
                    revalidateAll();
                    broadcast({ type: "SHARE_DIALOG_UPDATE" });
                  }}
                />
              ) : null}
            </Tabs.Content>
          </Tabs.Root>
          <ShareDialogDefault
            className={styles.dialogSection}
            defaultAccess={defaultAccess}
            documentId={documentId}
            fullAccess={currentUserAccess === DocumentAccess.FULL}
            onSetDefaultAccess={() => {
              revalidateAll();
              broadcast({ type: "SHARE_DIALOG_UPDATE" });
            }}
          />
        </div>
      }
      title="Share document"
      {...props}
    >
      {children}
    </Dialog>
  );
}
