import { kInternal } from "@liveblocks/core";
import {
  ClientSideSuspense,
  createLiveblocksContext,
  createRoomContext,
  useClient,
} from "@liveblocks/react";
import {
  Composer,
  InboxNotification,
  InboxNotificationList,
  Thread,
} from "@liveblocks/react-ui";
import * as React from "react";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary } from "react-error-boundary";

import { getRoomFromUrl, getUserFromUrl, Row } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";
import { FAKE_USERS } from "../api/_utils";

const client = createLiveblocksClient({
  authEndpoint: async (_roomId) => {
    const userId = getUserFromUrl();
    const resp = await fetch(
      `/api/auth/access-token?user=${encodeURIComponent(userId)}`
    );
    return resp.json();
  },

  resolveUsers({ userIds }) {
    // Return a list of users
    return userIds.map((idString) => {
      const index = Number(idString.slice("user-".length)) - 1;
      return !isNaN(index)
        ? { id: `user-${idString}`, name: FAKE_USERS[index] }
        : undefined;
    });
  },

  resolveMentionSuggestions({ text }) {
    // The text the user is searching for, e.g. "mar"
    // Return a list of user IDs that match the query
    text = text.toLowerCase();
    return FAKE_USERS.flatMap((name, index) =>
      name.toLowerCase().includes(text) ? [`user-${index + 1}`] : []
    );
  },
});

const {
  suspense: { LiveblocksProvider, useInboxNotifications },
} = createLiveblocksContext(client);

const {
  suspense: { RoomProvider, useSelf, useThreads, useDeleteComment },
} = createRoomContext(client);

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div style={{ border: "2px solid red", color: "red" }}>
      <p>Oops, an unexpected error happened.</p>
      <pre>{String(error)}</pre>
      <button onClick={resetErrorBoundary}>Retry</button>
    </div>
  );
}

function WithRoomProvider(props: React.PropsWithChildren) {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider id={roomId} initialPresence={{} as never}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ClientSideSuspense fallback="Loading...">
          {props.children}
        </ClientSideSuspense>
      </ErrorBoundary>
    </RoomProvider>
  );
}

function WithLiveblocksProvider(props: React.PropsWithChildren) {
  return (
    <LiveblocksProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ClientSideSuspense fallback="Loading...">
          {props.children}
        </ClientSideSuspense>
      </ErrorBoundary>
    </LiveblocksProvider>
  );
}

export default function Home() {
  return (
    <>
      <WithRoomProvider>
        <TopPart />
      </WithRoomProvider>
      <div style={{ fontFamily: "sans-serif" }}>
        <table width="100%">
          <tbody>
            <tr>
              <td width="50%" valign="top">
                <WithRoomProvider>
                  <LeftSide />
                </WithRoomProvider>
              </td>
              <td width="50%" valign="top">
                <WithLiveblocksProvider>
                  <RightSide />
                </WithLiveblocksProvider>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function useInboxNotificationsForThisPage() {
  const { inboxNotifications: allInboxNotifications } = useInboxNotifications();

  // Filter down inbox notifications to just the notifications from this room,
  // and only the ones that happened since the page was loaded. If we didn't
  // there could be a lot of existing inbox notifications, from different test
  // runs, or from the same user but from different rooms.
  const roomId = getRoomFromUrl();
  const [pageLoadTimestamp] = React.useState(() => Date.now());

  const inboxNotifications = allInboxNotifications.filter(
    (ibn) =>
      ibn.kind === "thread" &&
      ibn.roomId === roomId &&
      ibn.notifiedAt.getTime() > pageLoadTimestamp
  );

  return inboxNotifications;
}

function TopPart() {
  const me = useSelf();
  const { threads } = useThreads();
  const inboxNotifications = useInboxNotificationsForThisPage();
  const pendingCount = usePendingUpdatesCount();

  const deleteComment = useDeleteComment();

  function deleteAllMine() {
    for (const th of threads) {
      for (const cm of th.comments) {
        if (cm.userId === me.id) {
          deleteComment({ threadId: th.id, commentId: cm.id });
        }
      }
    }
  }

  return (
    <>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button id="delete-all-mine" onClick={() => deleteAllMine()}>
          Delete all my comments
        </Button>
      </div>
      <table>
        <tbody>
          <Row id="userId" name="userId" value={me.id} />
          <Row id="name" name="name" value={me.info?.name} />
          <Row
            id="numOfThreads"
            name="Number of Threads"
            value={threads?.length}
          />
          <Row
            id="numOfComments"
            name="Number of Comments"
            value={threads?.reduce((acc, cur) => acc + cur.comments.length, 0)}
          />
          <Row
            id="numOfNotifications"
            name="Number of Notifications"
            value={inboxNotifications?.length}
          />
          <Row
            id="numPendingUpdates"
            name="Number of pending updates"
            value={pendingCount}
          />
        </tbody>
      </table>
    </>
  );
}

function usePendingUpdatesCount() {
  const client = useClient();
  const store = client[kInternal].cacheStore;
  const getter = React.useCallback(
    () => store.get().optimisticUpdates.length,
    [store]
  );
  return React.useSyncExternalStore(store.subscribe, getter, getter);
}

function LeftSide() {
  const { threads } = useThreads();
  return (
    <div id="left">
      <h3>Threads</h3>
      <div
        style={{
          background: "#d8efef",
          paddingTop: 1,
        }}
      >
        {threads.map((thread) => (
          <div key={thread.id} style={{ margin: 20 }}>
            <Thread thread={thread} />
          </div>
        ))}
        <Composer
          id="new-thread-composer"
          overrides={{
            COMPOSER_PLACEHOLDER: "Start a new thread…",
          }}
        />
      </div>
    </div>
  );
}

function RightSide() {
  const inboxNotifications = useInboxNotificationsForThisPage();
  return (
    <div id="right">
      <h3>Thread Inbox Notifications (for this room only)</h3>
      <div
        style={{
          background: "#efd8ef",
          // padding: 20,
        }}
      >
        <InboxNotificationList>
          {inboxNotifications.map((ibn) => (
            <InboxNotification key={ibn.id} inboxNotification={ibn} />
          ))}
        </InboxNotificationList>
      </div>
    </div>
  );
}
