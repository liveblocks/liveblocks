import {
  ClientSideSuspense,
  createLiveblocksContext,
  createRoomContext,
} from "@liveblocks/react";
import * as React from "react";

import {
  Composer,
  InboxNotification,
  InboxNotificationList,
  Thread,
} from "../../../../packages/liveblocks-react-comments/dist";
import { getRoomFromUrl, getUserFromUrl, Row } from "../../utils";
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
  suspense: { useInboxNotifications },
} = createLiveblocksContext(client);

const {
  suspense: { RoomProvider, useSelf, useThreads },
} = createRoomContext(client);

export default function Home() {
  const roomId = getRoomFromUrl();

  return (
    <RoomProvider id={roomId} initialPresence={{} as never}>
      <ClientSideSuspense fallback="Loading...">
        {() => <Skeleton />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function Skeleton() {
  return (
    <>
      <TopPart />
      <div style={{ fontFamily: "sans-serif" }}>
        <table width="100%">
          <tbody>
            <tr>
              <td width="50%" valign="top">
                <LeftSide />
              </td>
              <td width="50%" valign="top">
                <RightSide />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function TopPart() {
  const me = useSelf();
  const { threads } = useThreads();
  return (
    <table>
      <tbody>
        <Row id="userId" name="userId" value={me.id} />
        <Row id="name" name="name" value={me.info?.name} />
        <Row
          id="numOfThreads"
          name="Number of Threads"
          value={threads?.length}
        />
      </tbody>
    </table>
  );
}

function LeftSide() {
  const { threads } = useThreads();
  return (
    <>
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
          overrides={{
            COMPOSER_PLACEHOLDER: "Start a new thread…",
          }}
        />
      </div>
    </>
  );
}

function RightSide() {
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

  return (
    <>
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
    </>
  );
}
