"use client";

import Link from "next/link";
import { useTransition } from "react";

import { useMyDocs } from "@/lib/use-my-docs";
import type { DocsPage } from "@/lib/docs-pagination";
import { parseRoomId } from "@/lib/room-ids";

import { deleteDoc } from "./actions";

export function DocsList({
  initialFirstPage,
}: {
  initialFirstPage: DocsPage;
}) {
  const { data, size, setSize, isValidating, mutate } = useMyDocs({
    fallbackData: [initialFirstPage],
  });

  const pages = data ?? [initialFirstPage];
  const docs = pages.flatMap((p) => p.docs);
  const lastPage = pages[pages.length - 1];
  const hasMore = lastPage?.nextCursor != null;
  const isLoadingMore = isValidating && size > pages.length;
  const [isDeleting, startDelete] = useTransition();

  if (docs.length === 0) {
    return (
      <div className="border-border-strong bg-bg-elev text-text-muted rounded-xl border border-dashed p-12 text-center">
        <p>You don&apos;t have any documents yet.</p>
      </div>
    );
  }

  return (
    <>
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
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  startDelete(async () => {
                    await deleteDoc(docId);
                    await mutate();
                  });
                }}
                className="border-border-strong text-danger hover:bg-danger/10 h-[30px] cursor-pointer rounded-lg border bg-transparent px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={() => setSize(size + 1)}
            className="border-border-strong text-text hover:bg-bg-muted h-[34px] cursor-pointer rounded-lg border bg-transparent px-4 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </>
  );
}
