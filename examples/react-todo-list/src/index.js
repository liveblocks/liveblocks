import React from "react";
import ReactDOM from "react-dom";
import { createClient } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import App from "./App";
import "./index.css";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  throw new Error(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/react-todo-list#getting-started.`
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const defaultRoomId = "react-todo-list";

function Page() {
  const [roomId, setRoomId] = useState(defaultRoomId);

  /**
   * Add a suffix to the room ID using a query parameter.
   * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
   *
   * http://localhost:3000/?room=1234 → react-todo-list-1234
   */
  useEffect(() => {
    const roomSuffix = new URLSearchParams(window?.location?.search).get(
      "room"
    );

    if (roomSuffix) {
      setRoomId(`${defaultRoomId}-${roomSuffix}`);
    }
  }, []);

  return (
    <RoomProvider id={roomId}>
      <App />
    </RoomProvider>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <LiveblocksProvider client={client}>
      <Page />
    </LiveblocksProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
