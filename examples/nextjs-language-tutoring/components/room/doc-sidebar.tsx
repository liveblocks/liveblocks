"use client";

import { useOthers } from "@liveblocks/react/suspense";
import { useState } from "react";
import { DOC_TYPE_ICONS } from "@/components/chat/snapshot-card";
import { NewDocMenu } from "@/components/docs/new-doc-menu";
import {
  compareDocuments,
  useDocuments,
  useReorderDocument,
} from "@/components/docs/use-documents";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export function DocSidebar({
  activeDocId,
  onSelect,
}: {
  activeDocId: string | null;
  onSelect: (docId: string) => void;
}) {
  const documents = useDocuments();
  const reorderDocument = useReorderDocument();
  const others = useOthers();
  const sorted = [...documents].sort(compareDocuments);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function finishDrag() {
    setDraggingId(null);
    setDropIndex(null);
  }

  function dropDocument(event: React.DragEvent, index: number) {
    event.preventDefault();
    const docId = draggingId ?? event.dataTransfer.getData("text/plain");
    if (docId) reorderDocument(docId, index);
    finishDrag();
  }

  return (
    <nav
      aria-label="Documents"
      className="flex w-[240px] shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 pr-2 pl-4">
        <h2 className="text-sm font-semibold">Documents</h2>
        <NewDocMenu onCreated={onSelect} />
      </div>
      <ul
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2"
        onDragOver={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropIndex(sorted.length);
        }}
        onDrop={(event) => {
          if (event.target !== event.currentTarget) return;
          dropDocument(event, sorted.length);
        }}
      >
        {sorted.map((doc, index) => {
          const Icon = DOC_TYPE_ICONS[doc.type];
          const viewers = others.filter(
            (other) => other.presence.docId === doc.id
          );
          const active = doc.id === activeDocId;
          const showBefore = dropIndex === index && draggingId !== doc.id;
          return (
            <li
              key={doc.id}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const rect = event.currentTarget.getBoundingClientRect();
                setDropIndex(
                  event.clientY > rect.top + rect.height / 2 ? index + 1 : index
                );
              }}
              onDrop={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                dropDocument(
                  event,
                  event.clientY > rect.top + rect.height / 2 ? index + 1 : index
                );
              }}
              className={cn(
                "relative",
                draggingId === doc.id && "opacity-40"
              )}
            >
              {showBefore ? <DropLine /> : null}
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", doc.id);
                  setDraggingId(doc.id);
                }}
                onDragEnd={finishDrag}
                onClick={() => onSelect(doc.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition active:cursor-grabbing",
                  active
                    ? "bg-neutral-100 font-medium"
                    : "text-neutral-700 hover:bg-neutral-50"
                )}
              >
                <Icon
                  className="size-4 shrink-0 text-neutral-500"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                {viewers.length > 0 ? (
                  <span
                    className="flex shrink-0 -space-x-1.5"
                    aria-label={`Viewed by ${viewers
                      .map((viewer) => viewer.info.name)
                      .join(", ")}`}
                  >
                    {viewers.slice(0, 3).map((viewer) => (
                      <UserAvatar
                        key={viewer.connectionId}
                        info={viewer.info}
                        size={18}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
        {sorted.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-neutral-500">
            No documents yet
          </li>
        ) : null}
        <li
          aria-hidden
          className="relative min-h-6 flex-1"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropIndex(sorted.length);
          }}
          onDrop={(event) => dropDocument(event, sorted.length)}
        >
          {dropIndex === sorted.length ? <DropLine /> : null}
        </li>
      </ul>
    </nav>
  );
}

function DropLine() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 rounded-none bg-neutral-900"
    />
  );
}
