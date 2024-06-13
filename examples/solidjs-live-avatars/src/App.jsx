import { createSignal, onCleanup, onMount } from "solid-js";
import Avatar from "./components/Avatar.jsx";
import styles from "./App.module.css";

function App({ room }) {
  const [currentUser, setCurrentUser] = createSignal(room.getPresence());
  const [users, setUsers] = createSignal([]);
  const hasMoreUsers = () => users().length > 3;

  onMount(() => {
    const unsubscribePresence = room.subscribe("my-presence", (presence) => {
      setCurrentUser(presence);
    });

    const unsubscribeOthers = room.subscribe("others", (others) => {
      const othersWithPresence = others.filter((user) => user?.presence);
      setUsers(othersWithPresence);
    });

    onCleanup(() => {
      unsubscribePresence();
      unsubscribeOthers();
    });
  });

  return (
    <main class={styles.App}>
      <For each={users().slice(0, 3)}>
        {({ presence }) => (
          <Avatar src={presence.avatar} name={presence.name} />
        )}
      </For>

      <Show when={hasMoreUsers()}>
        <div class={styles.more}>+{users().length - 3}</div>
      </Show>

      <Show when={currentUser()}>
        <div class={styles.you}>
          <Avatar src={currentUser().avatar} name="You" />
        </div>
      </Show>
    </main>
  );
}

export default App;
