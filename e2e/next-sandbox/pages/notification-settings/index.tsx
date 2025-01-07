import {
  createRoomContext,
  useRoomNotificationSettings,
  useSyncStatus,
} from "@liveblocks/react";
import type { PropsWithChildren } from "react";

import { getRoomFromUrl, getUserFromUrl, RenderCount, Row } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient({
  preventUnsavedChanges: true,

  authEndpoint: async (_roomId) => {
    const userId = getUserFromUrl();
    const resp = await fetch(
      `/api/auth/access-token?user=${encodeURIComponent(userId)}`
    );
    return resp.json();
  },
});

const { RoomProvider, useSelf } = createRoomContext(client);

function WithRoomProvider(props: PropsWithChildren) {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider id={roomId} initialPresence={{} as never}>
      {props.children}
    </RoomProvider>
  );
}

export default function Home() {
  return (
    <>
      <WithRoomProvider>
        <TopPart />
      </WithRoomProvider>
      <div style={{ fontFamily: "sans-serif" }}>
        <WithRoomProvider>
          <LeftSide />
        </WithRoomProvider>
      </div>
    </>
  );
}

function TopPart() {
  const me = useSelf();
  const syncStatus = useSyncStatus();
  const smoothSyncStatus = useSyncStatus({ smooth: true });
  return (
    <>
      <table>
        <tbody>
          <Row id="userId" name="userId" value={me?.id} />
          <Row id="name" name="name" value={me?.info?.name} />
          <Row id="syncStatus" name="Sync status" value={syncStatus} />
          <Row
            id="smoothSyncStatus"
            name="Sync status (smooth)"
            value={smoothSyncStatus}
          />
        </tbody>
      </table>
    </>
  );
}

function LeftSide() {
  const [data, setSettings] = useRoomNotificationSettings();
  const { settings } = data;

  return (
    <div id="left">
      <h3>
        Settings (<RenderCount />)
      </h3>
      <Button
        id="change-to-all"
        enabled={data.settings && data.settings.threads !== "all"}
        onClick={() => {
          setSettings({ threads: "all" });
        }}
      >
        Notify about all
      </Button>
      <Button
        id="change-to-replies_and_mentions"
        enabled={
          data.settings && data.settings.threads !== "replies_and_mentions"
        }
        onClick={() => {
          setSettings({ threads: "replies_and_mentions" });
        }}
      >
        Notify about replies & mentions only
      </Button>
      <Button
        id="change-to-none"
        enabled={data.settings && data.settings.threads !== "none"}
        onClick={() => {
          setSettings({ threads: "none" });
        }}
      >
        Disable notifications
      </Button>
      <Button
        id="change-to-invalid-value"
        // @ts-expect-error - deliberately invalid value
        enabled={data.settings && data.settings.threads !== "henk"}
        onClick={() => {
          // @ts-expect-error - deliberately invalid value
          setSettings({ threads: "henk" });
        }}
      >
        Set to invalid value
      </Button>
      <table>
        <tbody>
          <Row
            id="data"
            name="data"
            // @ts-expect-error henk
            value={data}
          />
          <Row id="settings" name="settings" value={settings} />
        </tbody>
      </table>
    </div>
  );
}
