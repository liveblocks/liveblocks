import Link from "next/link";

import { listMyDocs, createDoc, deleteDoc } from "./actions";
import { parseRoomId } from "@/lib/liveblocks-server";
import styles from "./page.module.css";

export default async function DocsIndexPage() {
  const docs = await listMyDocs();

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Your documents</h1>
          <p className={styles.sub}>
            Every document is a Liveblocks room. Every version inside it is a
            <code> Y.Text</code> in the room&apos;s Yjs document.
          </p>
        </div>
        <form action={createDoc} className={styles.newDocForm}>
          <input
            name="title"
            type="text"
            placeholder="New document title"
            className={styles.newDocInput}
          />
          <button type="submit" className={styles.newDocButton}>
            Create
          </button>
        </form>
      </div>

      {docs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You don&apos;t have any documents yet.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {docs.map((room) => {
            const parsed = parseRoomId(room.id);
            const docId = parsed?.docId ?? room.id;
            return (
              <li key={room.id} className={styles.row}>
                <Link href={`/docs/${docId}`} className={styles.rowLink}>
                  <span className={styles.title}>
                    {room.metadata?.title || "Untitled document"}
                  </span>
                  <span className={styles.meta}>
                    Updated{" "}
                    {new Date(
                      room.lastConnectionAt ?? room.createdAt
                    ).toLocaleString()}
                  </span>
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteDoc(docId);
                  }}
                >
                  <button type="submit" className={styles.deleteButton}>
                    Delete
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
