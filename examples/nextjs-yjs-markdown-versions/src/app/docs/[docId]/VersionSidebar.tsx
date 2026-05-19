"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";

import { useMyDocs } from "@/lib/use-my-docs";
import { parseRoomId } from "@/lib/room-ids";
import type { VersionInfo } from "@/lib/yjs-versions";

import { createDoc } from "../actions";

type SidebarSection = "documents" | "versions";

export function VersionSidebar({
  open,
  onToggle,
  versions,
  selectedIndex,
  onSelectIndex,
  currentDocId,
}: {
  open: boolean;
  onToggle: () => void;
  versions: VersionInfo[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  currentDocId: string;
}) {
  const [section, setSection] = useState<SidebarSection>("versions");

  return (
    <aside
      aria-label="Document and version navigation"
      className={clsx(
        "bg-bg-elev border-border relative flex min-h-0 flex-none flex-col border-r transition-[width] duration-200 ease-out",
        open ? "w-[280px]" : "w-7"
      )}
    >
      <button
        type="button"
        className="bg-bg-elev border-border-strong text-text-muted hover:bg-bg-muted hover:text-text absolute right-[-10px] top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border p-0 text-xs font-bold leading-none"
        onClick={onToggle}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        title={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        {open ? "‹" : "›"}
      </button>

      {open ? (
        <>
          <div role="tablist" className="border-border flex flex-none border-b">
            <SidebarTab
              label="Documents"
              active={section === "documents"}
              onClick={() => setSection("documents")}
            />
            <SidebarTab
              label={`Versions (${versions.length})`}
              active={section === "versions"}
              onClick={() => setSection("versions")}
            />
          </div>

          {section === "documents" ? (
            <DocumentsSection currentDocId={currentDocId} />
          ) : (
            <VersionsSection
              versions={versions}
              selectedIndex={selectedIndex}
              onSelectIndex={onSelectIndex}
            />
          )}
        </>
      ) : null}
    </aside>
  );
}

function SidebarTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        "flex-1 cursor-pointer border-0 border-b-2 bg-transparent px-3 pb-2.5 pt-3.5 text-xs font-semibold",
        active
          ? "text-text border-accent"
          : "text-text-muted hover:text-text border-transparent"
      )}
    >
      {label}
    </button>
  );
}

function VersionsSection({
  versions,
  selectedIndex,
  onSelectIndex,
}: {
  versions: VersionInfo[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  return (
    <ul className="min-h-0 flex-1 list-none overflow-y-auto p-0 pb-3 pt-1">
      {versions.map((v, i) => {
        const isCurrent = i === versions.length - 1;
        const isSelected = i === selectedIndex;
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onSelectIndex(i)}
              className={clsx(
                "text-text flex w-full cursor-pointer items-center gap-2.5 border-0 border-l-2 bg-transparent px-4 py-2 text-left",
                isSelected
                  ? "bg-bg-muted border-accent cursor-default"
                  : "hover:bg-bg-muted border-transparent"
              )}
            >
              <span className="text-text-muted bg-bg border-border font-mono inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[11px] font-bold">
                v{i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold">
                  {v.label ?? (isCurrent ? "Current draft" : "Snapshot")}
                </span>
                <span className="text-text-muted text-[11px]">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </span>
              {isCurrent ? (
                <span className="text-accent bg-accent/10 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  current
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function DocumentsSection({ currentDocId }: { currentDocId: string }) {
  const { data, size, setSize, isLoading, isValidating } = useMyDocs();

  const pages = data ?? [];
  const docs = pages.flatMap((p) => p.docs);
  const lastPage = pages[pages.length - 1];
  const hasMore = lastPage ? lastPage.nextCursor != null : false;
  const isLoadingMore = isValidating && size > pages.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex-none border-b p-2">
        <form action={createDoc}>
          <button
            type="submit"
            className="bg-accent text-accent-fg inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent text-xs font-semibold hover:brightness-105"
          >
            <span aria-hidden>+</span>
            <span>New document</span>
          </button>
        </form>
      </div>

      {isLoading && pages.length === 0 ? (
        <div className="text-text-muted p-4 text-xs">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="text-text-muted p-4 text-xs">No other documents.</div>
      ) : (
        <ul className="min-h-0 flex-1 list-none overflow-y-auto p-0 pb-1 pt-1">
          {docs.map((room) => {
            const parsed = parseRoomId(room.id);
            const docId = parsed?.docId ?? room.id;
            const isCurrent = docId === currentDocId;
            const title = room.metadata?.title || "Untitled document";

            const inner = (
              <>
                <span
                  className={clsx(
                    "block h-2 w-2 shrink-0 rounded-full",
                    isCurrent ? "bg-accent" : "bg-border-strong"
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-semibold">
                    {title}
                  </span>
                  <span className="text-text-muted text-[11px]">
                    {isCurrent
                      ? "opened"
                      : new Date(
                          room.lastConnectionAt ?? room.createdAt
                        ).toLocaleDateString()}
                  </span>
                </span>
              </>
            );

            return (
              <li key={room.id}>
                {isCurrent ? (
                  <div className="text-text bg-bg-muted border-accent flex w-full items-center gap-2.5 border-l-2 px-4 py-2">
                    {inner}
                  </div>
                ) : (
                  <Link
                    href={`/docs/${docId}`}
                    className="text-text hover:bg-bg-muted flex w-full items-center gap-2.5 border-l-2 border-transparent px-4 py-2 no-underline"
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore ? (
        <div className="border-border flex-none border-t p-2">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={() => setSize(size + 1)}
            className="border-border-strong text-text hover:bg-bg-muted h-8 w-full cursor-pointer rounded-md border bg-transparent text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
