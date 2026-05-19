import Link from "next/link";

import { listMyDocs, createDoc, deleteDoc } from "./actions";
import { parseRoomId } from "@/lib/liveblocks-server";

export default async function DocsIndexPage() {
  const docs = await listMyDocs();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-8 pb-16 pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[22px] font-semibold tracking-tight">
            Your documents
          </h1>
          <p className="text-text-muted text-[13px]">
            Every document is a Liveblocks room. Every version inside it is a{" "}
            <code className="bg-bg-muted border-border font-mono rounded border px-1 text-xs">
              Y.Text
            </code>{" "}
            in the room&apos;s Yjs document.
          </p>
        </div>
        <form action={createDoc} className="flex gap-2">
          <input
            name="title"
            type="text"
            placeholder="New document title"
            className="border-border-strong bg-bg-elev text-text h-[34px] w-60 rounded-lg border px-3 text-[13px] outline-none"
          />
          <button
            type="submit"
            className="bg-accent text-accent-fg h-[34px] cursor-pointer rounded-lg border border-transparent px-3.5 text-[13px] font-semibold"
          >
            Create
          </button>
        </form>
      </div>

      {docs.length === 0 ? (
        <div className="border-border-strong bg-bg-elev text-text-muted rounded-xl border border-dashed p-12 text-center">
          <p>You don&apos;t have any documents yet.</p>
        </div>
      ) : (
        <ul className="bg-bg-elev border-border flex list-none flex-col overflow-hidden rounded-xl border p-0">
          {docs.map((room) => {
            const parsed = parseRoomId(room.id);
            const docId = parsed?.docId ?? room.id;
            return (
              <li
                key={room.id}
                className="border-border flex items-center gap-3 border-t px-4 py-3 first:border-t-0"
              >
                <Link
                  href={`/docs/${docId}`}
                  className="flex min-w-0 flex-1 flex-col gap-0.5"
                >
                  <span className="truncate text-sm font-semibold">
                    {room.metadata?.title || "Untitled document"}
                  </span>
                  <span className="text-text-muted text-xs">
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
                  <button
                    type="submit"
                    className="border-border-strong text-danger hover:bg-danger/10 h-[30px] cursor-pointer rounded-lg border bg-transparent px-3 text-xs font-semibold"
                  >
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
