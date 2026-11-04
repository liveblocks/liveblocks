"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { DocErrorBoundary } from "@/components/docs/doc-error-boundary";
import { DocumentView } from "@/components/docs/document-view";
import { useActiveDocId } from "@/components/docs/use-documents";
import type { LessonRoomDetails } from "@/lib/api";
import { DocSidebar } from "./doc-sidebar";
import { RoomHeader } from "./room-header";

export type RoomShellProps = {
  room: LessonRoomDetails;
  onRoomChange: (room: LessonRoomDetails) => void;
  refreshRoom: () => Promise<void>;
};

export function RoomShell(props: RoomShellProps) {
  const [activeDocId, setActiveDocId] = useActiveDocId();
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <RoomHeader
        {...props}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((open) => !open)}
      />
      <div className="flex min-h-0 flex-1 gap-3">
        <DocSidebar activeDocId={activeDocId} onSelect={setActiveDocId} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
          <DocErrorBoundary docId={activeDocId}>
            <DocumentView
              docId={activeDocId}
              onDeleted={() => setActiveDocId(null)}
            />
          </DocErrorBoundary>
        </main>
        {chatOpen ? (
          <aside className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
            <ChatPanel
              activeDocId={activeDocId}
              onOpenDocument={setActiveDocId}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
