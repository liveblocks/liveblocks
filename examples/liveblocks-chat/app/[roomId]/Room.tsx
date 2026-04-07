"use client";

import { LiveList, LiveObject } from "@liveblocks/client";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { Table } from "./Table";
import { Comments } from "./Comments";
import type { RowData } from "../liveblocks.config";

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--lb-bg)] text-sm text-stone-500">
      Loading…
    </div>
  );
}

export function Room({ roomId }: { roomId: string }) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{
        title: "",
        columns: new LiveList<string>([]),
        rows: new LiveList<LiveObject<RowData>>([]),
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <DocumentView />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function DocumentView() {
  return (
    <div className="flex h-screen min-h-0 bg-[var(--lb-bg)] text-stone-800">
      <main className="min-w-0 flex-1 overflow-auto px-8 py-10">
        <Table />
      </main>
      <aside className="flex w-[22rem] shrink-0 flex-col border-l border-stone-200/80 bg-white">
        <Comments />
      </aside>
    </div>
  );
}
