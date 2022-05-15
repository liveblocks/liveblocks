import { createSignal, onCleanup } from "solid-js";
import { Key } from "@solid-primitives/keyed";
import Cursor from "./components/Cursor.jsx";
import styles from "./App.module.css";

const COLORS = [
  "#E57373",
  "#9575CD",
  "#4FC3F7",
  "#81C784",
  "#FFF176",
  "#FF8A65",
  "#F06292",
  "#7986CB",
];

function App({ room }) {
  const [currentUser, setCurrentUser] = createSignal(room.getPresence());
  const [users, setUsers] = createSignal([]);

  const unsubscribePresence = room.subscribe("my-presence", presence => {
    setCurrentUser(presence);
  });

  const unsubscribeOthers = room.subscribe("others", others => {
    const othersWithPresence = others.toArray().filter(other => other?.presence);
    setUsers(othersWithPresence);
  });

  onCleanup(() => {
    unsubscribePresence();
    unsubscribeOthers();
  });

  return (
    <main
      class={styles.App}
      onPointerMove={(event) => {
        // Update the user cursor position on every pointer move
        room.updatePresence({
          cursor: {
            x: Math.round(event.clientX),
            y: Math.round(event.clientY),
          },
        })
      }}
      onPointerLeave={() =>
        // When the pointer leaves, set cursor to null
        room.updatePresence({
          cursor: null,
        })
      }
    >
      <div>
        {currentUser().cursor
          ? `${currentUser().cursor.x} × ${currentUser().cursor.y}`
          : "Move your cursor to broadcast its position to other people in the room."}
      </div>

      {/*
        <For> will fully rerender components on each update and break animations.
        This is because it uses referential equality, and we're creating new
        objects every render inside `room.subscribe`. Here we're using a keyed loop
        from @solid-primitives with `user => user.connectionId` as the key, to
        retain the elements and their animations.
      */}
      <Key each={users()} by="connectionId">{(user) => (
        <Show when={user().presence?.cursor}>
          <Cursor
            x={user().presence.cursor.x}
            y={user().presence.cursor.y}
            color={COLORS[user().connectionId % COLORS.length]}
          />
        </Show>
      )}</Key>
    </main>
  );
}

export default App;
