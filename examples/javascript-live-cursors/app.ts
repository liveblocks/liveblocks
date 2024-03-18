import { createClient } from "@liveblocks/client";

let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";
let roomId = "javascript-live-cursors";

applyExampleRoomIdAndApiKey();

if (!/^pk_/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/javascript-live-cursors#getting-started.`
  );
}

const client = createClient({
  throttle: 16,
  publicApiKey: PUBLIC_KEY,
});

type Presence = {
  cursor: {
    x: number;
    y: number;
  } | null;
};

// If you no longer need the room (for example when you unmount your
// component), make sure to call leave()
const { room, leave } = client.enterRoom<Presence>(roomId, {
  initialPresence: { cursor: null },
});

const cursorsContainer = document.getElementById("cursors-container")!;
const text = document.getElementById("text")!;

room.subscribe("my-presence", (presence) => {
  const cursor = presence?.cursor ?? null;

  text.innerHTML = cursor
    ? `${cursor.x} × ${cursor.y}`
    : "Move your cursor to broadcast its position to other people in the room.";
});

/**
 * Subscribe to every others presence updates.
 * The callback will be called if you or someone else enters or leaves the room
 * or when someone presence is updated
 */
room.subscribe("others", (others, event) => {
  switch (event.type) {
    case "reset": {
      // Clear all cursors
      cursorsContainer.innerHTML = "";
      for (const user of others) {
        updateCursor(user);
      }
      break;
    }
    case "leave": {
      deleteCursor(event.user);
      break;
    }
    case "enter":
    case "update": {
      updateCursor(event.user);
      break;
    }
  }
});

document.addEventListener("pointermove", (event) => {
  room.updatePresence({
    cursor: { x: Math.round(event.clientX), y: Math.round(event.clientY) },
  });
});

document.addEventListener("pointerleave", (e) => {
  room.updatePresence({ cursor: null });
});

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

// Update cursor position based on user presence
function updateCursor(user) {
  const cursor = getCursorOrCreate(user.connectionId);

  if (user.presence?.cursor) {
    cursor.style.transform = `translateX(${user.presence.cursor.x}px) translateY(${user.presence.cursor.y}px)`;
    cursor.style.opacity = "1";
  } else {
    cursor.style.opacity = "0";
  }
}

function getCursorOrCreate(connectionId): HTMLElement {
  let cursor: HTMLElement | null = document.getElementById(
    `cursor-${connectionId}`
  );

  if (cursor == null) {
    cursor = document
      .getElementById("cursor-template")!
      .cloneNode(true) as HTMLElement;
    cursor.id = `cursor-${connectionId}`;
    cursor.style.fill = COLORS[connectionId % COLORS.length];
    cursorsContainer.appendChild(cursor);
  }

  return cursor;
}

function deleteCursor(user) {
  const cursor = document.getElementById(`cursor-${user.connectionId}`);
  if (cursor) {
    cursor.parentNode!.removeChild(cursor);
  }
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function applyExampleRoomIdAndApiKey() {
  if (typeof window === "undefined") {
    return;
  }

  const query = new URLSearchParams(window?.location?.search);
  const exampleId = query.get("exampleId");
  const apiKey = query.get("apiKey");

  if (exampleId) {
    roomId = exampleId ? `${roomId}-${exampleId}` : roomId;
  }

  if (apiKey) {
    PUBLIC_KEY = apiKey;
  }
}
