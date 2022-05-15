import { createSignal, onCleanup } from "solid-js";
import Cursor from "./components/Cursor.jsx";
import styles from "./App.module.css";

function App({ room }) {
  const [currentUser, setCurrentUser] = createSignal(room.getPresence());
  const [users, setUsers] = createSignal([]);

  const unsubscribePresence = room.subscribe("my-presence", presence => {
    console.log(presence.cursor);
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
      <For each={users()}>{({ presence }) => (
        <Show when={presence.cursor}>
          <Cursor x={presence.cursor.x} y={presence.cursor.y} color="red" />
        </Show>
      )}</For>

      <Show when={currentUser()}>
        <div class={styles.you}>
          <Cursor />
        </div>
      </Show>
    </main>
  );
}

export default App;
