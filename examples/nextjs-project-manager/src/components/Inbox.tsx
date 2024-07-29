"use client";

import {
  useInboxNotifications,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import { ErrorBoundary } from "react-error-boundary";

export function Inbox() {
  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <ClientSideSuspense fallback={null}>
        <InboxNotifications />
      </ClientSideSuspense>
    </ErrorBoundary>
  );
}

function InboxNotifications() {
  const { inboxNotifications } = useInboxNotifications();

  return (
    <InboxNotificationList>
      {inboxNotifications.map((inboxNotification) => (
        <InboxNotification
          key={inboxNotification.id}
          inboxNotification={inboxNotification}
        />
      ))}
    </InboxNotificationList>
  );
}
