"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { DocErrorBoundary } from "@/components/docs/doc-error-boundary";
import { DocumentView } from "@/components/docs/document-view";
import { useActiveDocId } from "@/components/docs/use-documents";
import { PanelSpinner } from "@/components/panel-spinner";
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
        {/* Each panel loads on its own: a hook suspending in one of them
            (threads, user info, the chat feed) only blanks that panel */}
        <ClientSideSuspense
          fallback={
            <div className="flex w-[240px] shrink-0 rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
              <PanelSpinner />
            </div>
          }
        >
          <DocSidebar activeDocId={activeDocId} onSelect={setActiveDocId} />
        </ClientSideSuspense>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
          <DocErrorBoundary docId={activeDocId}>
            <ClientSideSuspense fallback={<PanelSpinner />}>
              <DocumentView
                docId={activeDocId}
                onDeleted={() => setActiveDocId(null)}
              />
            </ClientSideSuspense>
          </DocErrorBoundary>
        </main>
        {chatOpen ? (
          <aside className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
            <ClientSideSuspense fallback={<PanelSpinner />}>
              <ChatPanel
                activeDocId={activeDocId}
                onOpenDocument={setActiveDocId}
              />
            </ClientSideSuspense>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
