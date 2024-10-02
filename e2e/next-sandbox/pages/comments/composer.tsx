import { createRoomContext } from "@liveblocks/react";
import { Composer } from "@liveblocks/react-ui";
import * as React from "react";

import { getRoomFromUrl, getUserFromUrl } from "../../utils";
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

const { RoomProvider } = createRoomContext(client);

export default function Home() {
  const roomId = getRoomFromUrl();

  return (
    <RoomProvider id={roomId} initialPresence={{} as never}>
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const [composerKey, setComposerKey] = React.useState(0);

  return (
    <>
      <h3>Composer</h3>
      <div style={{ display: "flex", marginBottom: 20 }}>
        <Button id="reset" onClick={() => setComposerKey((key) => key + 1)}>
          Reset composer
        </Button>
      </div>
      <div
        style={{
          background: "#d8efef",
          padding: 20,
        }}
      >
        <Composer key={composerKey} />
      </div>
    </>
  );
}
