import { createClient } from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/auth",
});

const defaultRoomId = "express-javascript-live-cursors";

const roomSuffix = new URLSearchParams(window?.location?.search).get("room");
let roomId = defaultRoomId;

/**
 * Add a suffix to the room ID using a query parameter.
 * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
 *
 * http://localhost:3000/?room=1234 → express-javascript-live-cursors-1234
 */
if (roomSuffix) {
  roomId = `${defaultRoomId}-${roomSuffix}`;
}

const room = client.enter(roomId, { cursor: null });

const cursorsContainer = document.getElementById("cursors-container");
const text = document.getElementById("text");

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
      for (const user of others.toArray()) {
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

document.addEventListener("pointermove", (e) => {
  room.updatePresence({
    cursor: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
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

function getCursorOrCreate(connectionId) {
  let cursor = document.getElementById(`cursor-${connectionId}`);

  if (cursor == null) {
    cursor = document.getElementById("cursor-template").cloneNode(true);
    cursor.id = `cursor-${connectionId}`;
    cursor.style.fill = COLORS[connectionId % COLORS.length];
    cursorsContainer.appendChild(cursor);
  }

  return cursor;
}

function deleteCursor(user) {
  const cursor = document.getElementById(`cursor-${user.connectionId}`);
  if (cursor) {
    cursor.parentNode.removeChild(cursor);
  }
}
