import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";
import * as React from "react";

import { getRoomFromUrl, getUserFromUrl, Row } from "../../utils";
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
});

const { LiveblocksProvider, useChannelsNotificationSettings } =
  createLiveblocksContext(client);

const { RoomProvider, useSelf } = createRoomContext(client);

function WithLiveblocksProvider(props: React.PropsWithChildren) {
  return <LiveblocksProvider>{props.children}</LiveblocksProvider>;
}

function WithRoomProvider(props: React.PropsWithChildren) {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider id={roomId} initialPresence={{} as never}>
      {props.children}
    </RoomProvider>
  );
}

function Channel({
  name,
  thread,
  textMention,
  onUpdate,
}: {
  name: string;
  thread: boolean;
  textMention: boolean;
  onUpdate: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        marginBottom: 10,
      }}
    >
      <h4 style={{ margin: "8px 0" }}>{name} channel</h4>
      <table width="100%">
        <tbody>
          <Row
            id={name + "ThreadKind"}
            name="Thread"
            value={thread ? "Yes" : "No"}
          />
          <Row
            id={name + "TextMentionKind"}
            name="Text Mention"
            value={textMention ? "Yes" : "No"}
          />
        </tbody>
      </table>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button id={name + "_update_channel"} onClick={onUpdate}>
          Update
        </Button>
      </div>
    </div>
  );
}

function Settings() {
  const [{ isLoading, error, settings }, updateSettings] =
    useChannelsNotificationSettings();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <table width="100%">
        <tbody>
          <Row id="isLoading" name="isLoading" value={isLoading} />
          <Row id="error" name="error" value={JSON.stringify(error)} />
        </tbody>
      </table>
      <Channel
        name="email"
        thread={settings?.email.thread ?? false}
        textMention={settings?.email.textMention ?? false}
        onUpdate={() =>
          updateSettings({
            email: {
              thread: true,
              textMention: true,
            },
          })
        }
      />
      <Channel
        name="slack"
        thread={settings?.slack.thread ?? false}
        textMention={settings?.slack.textMention ?? false}
        onUpdate={() =>
          updateSettings({
            slack: {
              thread: true,
              textMention: true,
            },
          })
        }
      />
      <Channel
        name="teams"
        thread={settings?.teams.thread ?? false}
        textMention={settings?.teams.textMention ?? false}
        onUpdate={() =>
          updateSettings({
            teams: {
              thread: true,
              textMention: true,
            },
          })
        }
      />
      <Channel
        name="webPush"
        thread={settings?.webPush.thread ?? false}
        textMention={settings?.webPush.textMention ?? false}
        onUpdate={() =>
          updateSettings({
            webPush: {
              thread: true,
              textMention: true,
            },
          })
        }
      />
    </div>
  );
}

function Header() {
  const me = useSelf();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        fontFamily: "sans-serif",
      }}
    >
      <h3>Channels notification settings</h3>
      <div style={{ display: "flex", width: "100%", margin: "8px 0" }}>
        <table width="100%">
          <tbody>
            <Row id="userId" name="userId" value={me?.id} />
            <Row id="name" name="name" value={me?.info?.name} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SandboxPage() {
  return (
    <WithLiveblocksProvider>
      <WithRoomProvider>
        <Header />
      </WithRoomProvider>
      <hr />
      <Settings />
    </WithLiveblocksProvider>
  );
}
