import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react";
import { Composer } from "@liveblocks/react-ui";
import type { ComponentProps } from "react";
import { useState } from "react";

import { getRoomFromUrl } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClientOptions } from "../../utils/createClient";
import { FAKE_USERS } from "../api/_utils";

const clientOptions = createLiveblocksClientOptions();

export type TestVariant = "default" | "autoFocus" | "disabled" | "defaultValue";

function getTestVariantFromUrl(): TestVariant {
  if (typeof window === "undefined") {
    return "default";
  }

  const q = new URL(window.location.href).searchParams;
  const variant = q.get("variant");
  return (variant as TestVariant) ?? "default";
}

function getComposerPropsFromUrl(): ComponentProps<typeof Composer> {
  const variant = getTestVariantFromUrl();

  switch (variant) {
    case "autoFocus":
      return { autoFocus: true };
    case "disabled":
      return { disabled: true };
    case "defaultValue":
      return {
        defaultValue: {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [{ text: "Hello, world!" }],
            },
          ],
        },
      };
    default:
      return {};
  }
}

export default function Home() {
  const roomId = getRoomFromUrl();

  return (
    <LiveblocksProvider
      {...clientOptions}
      resolveUsers={({ userIds }) => {
        // Return a list of users
        return userIds.map((idString) => {
          const index = Number(idString.slice("user-".length)) - 1;
          return !isNaN(index)
            ? { id: `user-${idString}`, name: FAKE_USERS[index] }
            : undefined;
        });
      }}
      resolveMentionSuggestions={({ text }) => {
        // The text the user is searching for, e.g. "mar"
        // Return a list of user IDs that match the query
        text = text.toLowerCase();
        return FAKE_USERS.flatMap((name, index) =>
          name.toLowerCase().includes(text) ? [`user-${index + 1}`] : []
        );
      }}
    >
      {/* We're only testing the composer component itself and not interacting with rooms */}
      <RoomProvider id={roomId} autoConnect={false}>
        <ClientSideSuspense fallback={null}>
          <Sandbox />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function Sandbox() {
  const props = getComposerPropsFromUrl();
  const [key, setKey] = useState(0);
  const [output, setOutput] = useState<string>();

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
          overrides={{
            COMPOSER_PLACEHOLDER: "",
          }}
          {...props}
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
