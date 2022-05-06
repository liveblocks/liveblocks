import { createClient } from "@liveblocks/client";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const room = client.enter("javascript-live-cursors", { cursor: null });

const cursorsContainer = document.getElementById("cursors-container");

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
  room.updatePresence({ cursor: { x: e.clientX, y: e.clientY } });
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
