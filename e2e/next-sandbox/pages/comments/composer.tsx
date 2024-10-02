import { createRoomContext } from "@liveblocks/react";
import { Composer } from "@liveblocks/react-ui";
import * as React from "react";

import { getRoomFromUrl } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";
import { FAKE_USERS } from "../api/_utils";

const client = createLiveblocksClient({
  authEndpoint: async (_roomId) => {
    const resp = await fetch("/api/auth/access-token");
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
  const [key, setKey] = React.useState(0);
  const [output, setOutput] = React.useState<string>();

  return (
    <>
      <h3>Composer</h3>
      <div style={{ display: "flex", marginBottom: 20 }}>
        <Button id="reset-composer" onClick={() => setKey((key) => key + 1)}>
          Reset composer
        </Button>
        <Button id="reset-output" onClick={() => setOutput(undefined)}>
          Reset output
        </Button>
        <Button
          id="reset"
          onClick={() => {
            setKey((key) => key + 1);
            setOutput(undefined);
          }}
        >
          Reset both
        </Button>
      </div>
      {output && (
        <pre
          id="output"
          style={{
            background: "#f3f3f3",
            padding: 20,
            marginBottom: 20,
          }}
        >
          <code>{output}</code>
        </pre>
      )}
      <div
        style={{
          background: "#d8efef",
          padding: 20,
        }}
      >
        <Composer
          key={key}
          id="composer"
          onComposerSubmit={(comment, event) => {
            // Prevent creating a comment/thread
            event.preventDefault();

            setOutput(JSON.stringify(comment, null, 2));
          }}
        />
      </div>
    </>
  );
}
