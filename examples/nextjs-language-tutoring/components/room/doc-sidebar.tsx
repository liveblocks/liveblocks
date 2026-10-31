"use client";

import { useOthers } from "@liveblocks/react/suspense";
import { DOC_TYPE_ICONS } from "@/components/chat/snapshot-card";
import { NewDocMenu } from "@/components/docs/new-doc-menu";
import { useDocuments } from "@/components/docs/use-documents";
import { UserAvatar } from "@/components/user-avatar";
import type { LessonRoomDetails } from "@/lib/api";
import { cn } from "@/lib/utils";

export function DocSidebar({
  room,
  activeDocId,
  onSelect,
}: {
  room: LessonRoomDetails;
  activeDocId: string | null;
  onSelect: (docId: string) => void;
}) {
  const documents = useDocuments();
  const others = useOthers();
  const sorted = [...documents].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <nav
      aria-label="Documents"
      className="flex w-[240px] shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 pr-2 pl-4">
        <h2 className="text-sm font-semibold">Documents</h2>
        <NewDocMenu onCreated={onSelect} />
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {sorted.map((doc) => {
          const Icon = DOC_TYPE_ICONS[doc.type];
          const viewers = others.filter(
            (other) => other.presence.docId === doc.id
          );
          const active = doc.id === activeDocId;
          return (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => onSelect(doc.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
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
      </ul>
      <div className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500">
        {room.members.length === 1
          ? "Invite a student to get started."
          : `${room.members.length} members · ${others.length + 1} online`}
      </div>
    </nav>
  );
}
