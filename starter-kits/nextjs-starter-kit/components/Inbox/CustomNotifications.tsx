import {
  InboxNotification,
  InboxNotificationCustomKindProps,
} from "@liveblocks/react-ui";
import { DocumentIcon } from "@/components/Documents";
import { DOCUMENT_URL } from "@/constants";
import { getDocument } from "@/lib/actions";
import { useDocumentsFunctionSWR } from "@/lib/hooks";
import { Button } from "@/primitives/Button";
import styles from "@/components/Inbox/Inbox.module.css";

// Component displayed when `$addedToDocument` custom notification is in inbox
export function AddedToDocumentNotification(
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
      href={DOCUMENT_URL(document.type, document.id)}
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
        <Button>Go to document</Button>
      </div>
    </InboxNotification.Custom>
  );
}
