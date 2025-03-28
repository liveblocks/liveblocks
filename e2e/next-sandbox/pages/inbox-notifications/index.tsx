import {
  createLiveblocksContext,
  createRoomContext,
  useSyncStatus,
} from "@liveblocks/react";
import {
  Composer,
  InboxNotification,
  InboxNotificationList,
  Thread,
} from "@liveblocks/react-ui";
import type { PropsWithChildren } from "react";
import { useState } from "react";

import { getRoomFromUrl, getUserFromUrl, RenderCount, Row } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";
import { FAKE_USERS } from "../api/_utils";

const client = createLiveblocksClient({
  preventUnsavedChanges: true,

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

const { LiveblocksProvider, useInboxNotifications } =
  createLiveblocksContext(client);

const { RoomProvider, useSelf, useThreads, useDeleteComment } =
  createRoomContext(client);

function WithRoomProvider(props: PropsWithChildren) {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider id={roomId} initialPresence={{} as never}>
      {props.children}
    </RoomProvider>
  );
}

function WithLiveblocksProvider(props: PropsWithChildren) {
  return <LiveblocksProvider>{props.children}</LiveblocksProvider>;
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
  const { isLoading, error, inboxNotifications } = useInboxNotifications();

  // Filter down inbox notifications to just the notifications from this room,
  // and only the ones that happened since the page was loaded. If we didn't
  // there could be a lot of existing inbox notifications, from different test
  // runs, or from the same user but from different rooms.
  const roomId = getRoomFromUrl();
  const [pageLoadTimestamp] = useState(() => Date.now());

  if (isLoading) return null;
  if (error) return error;

  return inboxNotifications.filter(
    (ibn) =>
      ibn.kind === "thread" &&
      ibn.roomId === roomId &&
      ibn.notifiedAt.getTime() > pageLoadTimestamp
  );
}

function TopPart() {
  const me = useSelf();
  const { threads } = useThreads();
  const inboxNotifications = useInboxNotificationsForThisPage();
  const syncStatus = useSyncStatus({ smooth: true });
  const isSynced = syncStatus === "synchronized";

  const deleteComment = useDeleteComment();

  function deleteAllMine() {
    if (threads) {
      for (const th of threads) {
        for (const cm of th.comments) {
          if (cm.userId === me?.id) {
            deleteComment({ threadId: th.id, commentId: cm.id });
          }
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
          <Row id="userId" name="userId" value={me?.id} />
          <Row id="name" name="name" value={me?.info?.name} />
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
            value={
              (Array.isArray(inboxNotifications) ? inboxNotifications : [])
                ?.length
            }
          />
          <Row
            id="smoothSyncStatus"
            name="Sync status (smooth)"
            value={syncStatus}
          />
          <Row
            id="isSynced"
            name="Is synchronized? (smooth)"
            value={isSynced}
          />
        </tbody>
      </table>
    </>
  );
}

function LeftSide() {
  const { threads } = useThreads();
  return (
    <div id="left">
      <h3>
        Threads (<RenderCount />)
      </h3>
      <div
        style={{
          background: "#d8efef",
          paddingTop: 1,
        }}
      >
        {(threads ?? []).map((thread) => (
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
      <h3>
        Thread Inbox Notifications (for this room only, <RenderCount />)
      </h3>
      <div
        style={{
          background: "#efd8ef",
          // padding: 20,
        }}
      >
        {inboxNotifications === null ? (
          "Loading..."
        ) : !Array.isArray(inboxNotifications) ? (
          <pre style={{ color: "red" }}>{String(inboxNotifications)}</pre>
        ) : (
          <InboxNotificationList>
            {inboxNotifications.map((ibn) => (
              <InboxNotification key={ibn.id} inboxNotification={ibn} />
            ))}
          </InboxNotificationList>
        )}
      </div>
    </div>
  );
}
