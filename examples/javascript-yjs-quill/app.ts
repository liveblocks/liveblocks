import { createClient } from "@liveblocks/client";
import LiveblocksProvider from "@liveblocks/yjs";
import * as Y from "yjs";
import Quill from "quill";
import { QuillBinding } from "y-quill";
import QuillCursors from "quill-cursors";

async function run() {
  let PUBLIC_KEY =
    "pk_dev_dwtpunT8QHkZj4IQEyClDDaTJVdQ8f0V0AOiyIwOP5nFmZdzv_nAudWSGHoCTEGM";
  let roomId = "javascript-yjs";

  overrideApiKeyAndRoomId();

  if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
    console.warn(
      `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
        `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/javascript-todo-list#getting-started.`
    );
  }

  const client = createClient({
    publicApiKey: PUBLIC_KEY,
  });

  const room = client.enter<{}, never>(roomId, {
    initialPresence: {},
  });

  // A Yjs document holds the shared data
  const ydoc = new Y.Doc();
  // Define a shared text type on the document
  const ytext = ydoc.getText("quill");

  Quill.register("modules/cursors", QuillCursors);

  const quill = new Quill(document.querySelector("#editor"), {
    modules: {
      cursors: true,
      toolbar: [
        // adding some basic Quill content features
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline"],
        ["code-block"],
      ],
      history: {
        // Local undo shouldn't undo changes
        // from remote users
        userOnly: true,
      },
    },
    placeholder: "Start collaborating...",
    theme: "snow", // 'bubble' is also great
  });

  const provider = new LiveblocksProvider(room, ydoc);

  // Create an editor-binding which
  // "binds" the quill editor to a Y.Text type.
  const binding = new QuillBinding(ytext, quill, provider.awareness);

  /**
   * This function is used when deploying an example on liveblocks.io.
   * You can ignore it completely if you run the example locally.
   */
  function overrideApiKeyAndRoomId() {
    const query = new URLSearchParams(window?.location?.search);
    const apiKey = query.get("apiKey");
    const roomIdSuffix = query.get("roomId");

    if (apiKey) {
      PUBLIC_KEY = apiKey;
    }

    if (roomIdSuffix) {
      roomId = `${roomId}-${roomIdSuffix}`;
    }
  }
}

run();
