import { ClientSideSuspense } from "@liveblocks/react";
import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
} from "@liveblocks/react/suspense";
import {
  InboxNotification,
  InboxNotificationCustomKindProps,
  InboxNotificationList,
} from "@liveblocks/react-ui";
import clsx from "clsx";
import { ComponentProps } from "react";
import { DocumentIcon } from "@/components/Documents";
import { DOCUMENT_URL } from "@/constants";
import { getDocument } from "@/lib/actions";
import { useDocumentsFunctionSWR } from "@/lib/hooks";
import { Button, LinkButton } from "@/primitives/Button";
import { Link } from "@/primitives/Link";
import { Spinner } from "@/primitives/Spinner";
import styles from "./Inbox.module.css";

function InboxContent(props: ComponentProps<"div">) {
  const { inboxNotifications } = useInboxNotifications();

  return (
    <div {...props}>
      {inboxNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <p>There aren’t any notifications yet.</p>
        </div>
      ) : (
        <InboxNotificationList>
          {inboxNotifications.map((inboxNotification) => {
            return (
              <InboxNotification
                key={inboxNotification.id}
                inboxNotification={inboxNotification}
                components={{ Anchor: Link }}
                kinds={{ $addedToDocument: AddedToDocumentNotification }}
              />
            );
          })}
        </InboxNotificationList>
      )}
    </div>
  );
}

function AddedToDocumentNotification(
  props: InboxNotificationCustomKindProps<"$addedToDocument">
) {
  const { documentId } = props.inboxNotification.activities[0].data;
  const { data: document } = useDocumentsFunctionSWR(
    [getDocument, { documentId }],
    { refreshInterval: 10000 }
  );

  if (!document) {
    return null;
  }

  return (
    <InboxNotification.Custom
      {...props}
      title={
        <>
          Added to <strong>{document.name}</strong>
        </>
      }
      aside={
        <div className={styles.icon}>
          <DocumentIcon type={document.type} />
        </div>
      }
    >
      You’ve been granted access to a new document.
      <div className={styles.addedToDocumentButton}>
        <LinkButton href={DOCUMENT_URL(document.type, document.id)}>
          Go to document
        </LinkButton>
      </div>
    </InboxNotification.Custom>
  );
}

export function Inbox({ className, ...props }: ComponentProps<"div">) {
  const markAllInboxNotificationsAsRead = useMarkAllInboxNotificationsAsRead();

  return (
    <div className={clsx(className, styles.inbox)} {...props}>
      <div className={styles.inboxHeader}>
        <h2>Notifications</h2>
        <Button onClick={markAllInboxNotificationsAsRead}>
          Mark all as read
        </Button>
      </div>
      <ClientSideSuspense
        fallback={
          <div className={styles.emptyState}>
            <Spinner />
          </div>
        }
      >
        <InboxContent />
      </ClientSideSuspense>
    </div>
  );
}
