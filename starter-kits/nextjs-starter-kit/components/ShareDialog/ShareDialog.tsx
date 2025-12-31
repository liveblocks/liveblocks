import {
  useBroadcastEvent,
  useEventListener,
} from "@liveblocks/react/suspense";
import { useSession } from "next-auth/react";
import { ComponentProps, useCallback, useEffect, useState } from "react";
import { CheckIcon, LinkIcon } from "@/icons";
import { getDocument, getDocumentUsers } from "@/lib/actions";
import { useDocumentsFunctionSWR, useInitialDocument } from "@/lib/hooks";
import { getDocumentAccess } from "@/lib/utils";
import { Button } from "@/primitives/Button";
import { Dialog } from "@/primitives/Dialog";
import { DocumentPermissionType } from "@/types";
import { ShareDialogDefault } from "./ShareDialogDefault";
import { ShareDialogInviteUser } from "./ShareDialogInviteUser";
import { ShareDialogUsers } from "./ShareDialogUsers";
import styles from "./ShareDialog.module.css";

type Props = Omit<ComponentProps<typeof Dialog>, "content" | "title">;

export function ShareDialog({ children, ...props }: Props) {
  const { data: session } = useSession();
  const {
    id: documentId,
    generalPermissions,
    userPermissions,
    owner,
  } = useInitialDocument();
  const fullAccess = owner === session?.user?.info.id;

  const [currentUserAccess, setCurrentUserAccess] =
    useState<DocumentPermissionType>(
      userPermissions[session?.user?.info.id ?? ""] || "read"
    );

  // Get a list of users attached to the document (+ their info)
  const {
    data: users,
    mutate: revalidateUsers,
    // error: usersError,
  } = useDocumentsFunctionSWR([getDocumentUsers, { documentId }], {
    refreshInterval: 0,
  });

  // Get the current document
  const {
    data: document,
    error: generalAccessError,
    mutate: revalidateDefaultAccess,
  } = useDocumentsFunctionSWR([getDocument, { documentId }], {
    refreshInterval: 0,
  });

  // If you have no access to this room, refresh
  if (generalAccessError && generalAccessError.code === 403) {
    window.location.reload();
  }

  // Refresh the current user's access level
  const revalidateCurrentUserAccess = useCallback(() => {
    if (!document) {
      return;
    }

    const accessLevel = getDocumentAccess({
      document,
      userId: session?.user?.info.id ?? "",
    });

    // TODO remember why this was here
    // Reload if current user has no access (will show error page)
    if (accessLevel === "none") {
      window.location.reload();
      return;
    }

    // Reload app if current user swapping between READONLY and EDIT/FULL (will reconnect to app with new access level)
    const accessChanges = new Set([currentUserAccess, accessLevel]);
    if (accessChanges.has("read") && accessChanges.has("write")) {
      window.location.reload();
      return;
    }

    setCurrentUserAccess(accessLevel);
  }, [document, session, currentUserAccess]);

  useEffect(() => {
    revalidateCurrentUserAccess();
  }, [document, revalidateCurrentUserAccess, session]);

  // Revalidate all access data
  function revalidateAll() {
    revalidateUsers();
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
          <ShareDialogInviteUser
            className={styles.dialogSection}
            documentId={documentId}
            fullAccess={fullAccess}
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
              fullAccess={fullAccess}
              onSetUsers={() => {
                revalidateAll();
                broadcast({ type: "SHARE_DIALOG_UPDATE" });
              }}
              users={users}
            />
          ) : null}

          <div className={styles.dialogDivider}>General access</div>

          <ShareDialogDefault
            className={styles.dialogSection}
            generalPermissions={generalPermissions}
            documentId={documentId}
            fullAccess={fullAccess}
            onSetDefaultAccess={() => {
              revalidateAll();
              broadcast({ type: "SHARE_DIALOG_UPDATE" });
            }}
          />
        </div>
      }
      title="Share document"
      titleButton={<CopyToClipboardButton />}
      {...props}
    >
      {children}
    </Dialog>
  );
}

// "Copy link" button
let copyToClipboardTimeout: number;
function CopyToClipboardButton() {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Show "Copied" for 3 seconds after copying
  const handleCopyToClipboard = useCallback(async () => {
    try {
      const thisUrl = window.location.origin + window.location.pathname;
      await navigator.clipboard.writeText(thisUrl);

      setCopiedToClipboard(true);
      window.clearTimeout(copyToClipboardTimeout);
      copyToClipboardTimeout = window.setTimeout(() => {
        setCopiedToClipboard(false);
      }, 3000);
    } catch {
      return;
    }
  }, []);

  return (
    <Button
      icon={
        copiedToClipboard ? (
          <CheckIcon height={16} width={16} />
        ) : (
          <LinkIcon height={16} width={16} />
        )
      }
      variant="subtle"
      onClick={handleCopyToClipboard}
      style={{ pointerEvents: copiedToClipboard ? "none" : "auto" }}
    >
      {copiedToClipboard ? "Copied" : "Copy link"}
    </Button>
  );
}
