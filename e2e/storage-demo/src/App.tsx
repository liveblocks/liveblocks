import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import {
  RoomClient,
  type RoomClientStatus,
} from "./sync/roomClient";

export function App() {
  const clientRef = useRef<RoomClient | null>(null);
  const [status, setStatus] = useState<RoomClientStatus>("connecting");
  const [actor, setActor] = useState<number | null>(null);
  const [peers, setPeers] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const client = new RoomClient();
    clientRef.current = client;
    const stop = client.subscribe((snap) => {
      setStatus(snap.status);
      setActor(snap.actor);
      setPeers(snap.peers);
      setItems(snap.items);
    });
    client.start();
    return () => {
      stop();
      client.stop();
      clientRef.current = null;
    };
  }, []);

  const ready = status === "ready";

  return (
    <main style={styles.shell}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>@liveblocks/storage · Room sync</p>
          <h1 style={styles.title}>Shared list</h1>
        </div>
        <div style={styles.meta}>
          <StatusPill status={status} />
          <span>
            peers <strong>{peers}</strong>
          </span>
          <span>
            actor <code>{actor ?? "—"}</code>
          </span>
        </div>
      </header>

      <p style={styles.blurb}>
        Two browser tabs share one <code>LiveList</code> via{" "}
        <code>StorageDoc</code> and the Liveblocks Room WebSocket protocol.
      </p>

      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text || !ready) return;
          clientRef.current?.addItem(text);
          setDraft("");
        }}
        style={styles.row}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={ready ? "Add an item…" : "Loading storage…"}
          disabled={!ready}
          maxLength={200}
          style={styles.input}
        />
        <button type="submit" disabled={!ready} style={styles.primary}>
          Add
        </button>
      </form>

      <ul style={styles.list}>
        {items.length === 0 ? (
          <li style={styles.empty}>
            {ready ? "List is empty — add something." : "Connecting…"}
          </li>
        ) : (
          items.map((item, index) => (
            <li key={`${index}-${item}`} style={styles.item}>
              <span style={styles.itemText}>{item}</span>
              <span style={styles.itemActions}>
                <button
                  type="button"
                  disabled={!ready || index === 0}
                  style={styles.iconBtn}
                  onClick={() => clientRef.current?.moveItem(index, index - 1)}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={!ready || index === items.length - 1}
                  style={styles.iconBtn}
                  onClick={() => clientRef.current?.moveItem(index, index + 1)}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={!ready}
                  style={styles.dangerBtn}
                  onClick={() => clientRef.current?.removeItem(index)}
                >
                  Remove
                </button>
              </span>
            </li>
          ))
        )}
      </ul>

      <pre style={styles.json}>{JSON.stringify({ items }, null, 2)}</pre>
    </main>
  );
}

function StatusPill({ status }: { status: RoomClientStatus }) {
  const background =
    status === "ready"
      ? "#ccfbf1"
      : status === "offline"
        ? "#fee2e2"
        : "#fef3c7";
  const dot =
    status === "ready"
      ? "#0f766e"
      : status === "offline"
        ? "#dc2626"
        : "#d97706";

  return (
    <span style={{ ...styles.pill, background }}>
      <span style={{ ...styles.dot, background: dot }} />
      {status}
    </span>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    width: "min(560px, 100%)",
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 18px 50px rgba(28, 25, 23, 0.08)",
    display: "grid",
    gap: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "start",
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: 11,
    color: "var(--muted)",
    fontWeight: 600,
  },
  title: {
    margin: "4px 0 0",
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: "-0.03em",
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    fontSize: 13,
    color: "var(--muted)",
  },
  blurb: {
    margin: 0,
    color: "var(--muted)",
    fontSize: 14,
    lineHeight: 1.5,
  },
  row: { display: "flex", gap: 8 },
  input: {
    flex: 1,
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: "10px 12px",
    background: "#fff",
    color: "var(--ink)",
  },
  primary: {
    border: 0,
    borderRadius: 10,
    padding: "10px 16px",
    background: "var(--accent)",
    color: "var(--accent-ink)",
    fontWeight: 600,
    cursor: "pointer",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    border: "1px solid var(--line)",
    borderRadius: 12,
    background: "#fff",
    overflow: "hidden",
  },
  empty: {
    padding: 16,
    color: "var(--system)",
    fontSize: 14,
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    borderTop: "1px solid var(--line)",
  },
  itemText: { fontSize: 15, wordBreak: "break-word" },
  itemActions: { display: "flex", gap: 6, flexShrink: 0 },
  iconBtn: {
    border: "1px solid var(--line)",
    borderRadius: 8,
    width: 32,
    height: 32,
    background: "#fff",
    cursor: "pointer",
  },
  dangerBtn: {
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "0 10px",
    height: 32,
    background: "#fff",
    color: "#b91c1c",
    cursor: "pointer",
    fontSize: 13,
  },
  json: {
    margin: 0,
    padding: 12,
    borderRadius: 12,
    background: "#1c1917",
    color: "#e7e5e4",
    fontFamily: "var(--mono)",
    fontSize: 12,
    overflow: "auto",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--ink)",
  },
  dot: { width: 7, height: 7, borderRadius: "50%" },
};
