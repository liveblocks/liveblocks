"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { FileTextIcon, HistoryIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { Chat } from "./Chat";
import { DocumentEditor } from "./editor";
import {
  VersionHistoryPreview,
  VersionHistorySidebar,
} from "./version-history";

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider id={roomId} initialPresence={{ promptingFeedId: null }}>
      <ClientSideSuspense
        fallback={
          <div className="flex h-dvh items-center justify-center text-muted-foreground">
            <Loader size={20} />
          </div>
        }
      >
        <App roomId={roomId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function App({ roomId }: { roomId: string }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );

  const openHistory = useCallback(() => {
    setSelectedVersionId(null);
    setHistoryOpen(true);
  }, []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  return (
    <div className="flex h-dvh w-full gap-2.5 overflow-hidden bg-neutral-50 p-2.5">
      {/* Main panel: the document (or, in history mode, a version preview) */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <header className="flex items-center justify-between gap-2 border-b border-neutral-950/5 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
            <h1 className="truncate text-sm font-medium">Shared document</h1>
          </div>
          <div className="flex items-center gap-2">
            <AvatarStack size={28} />
            <Button
              variant={historyOpen ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={historyOpen ? closeHistory : openHistory}
              aria-label="Version history"
            >
              <HistoryIcon className="size-4" />
            </Button>
          </div>
        </header>

        {/* The editor stays mounted (and connected) while previewing
            versions, so nothing reloads when closing the history. */}
        <div
          className={
            historyOpen ? "hidden" : "flex min-h-0 flex-1 flex-col"
          }
        >
          <DocumentEditor />
        </div>
        {historyOpen ? (
          selectedVersionId ? (
            <VersionHistoryPreview
              key={selectedVersionId}
              versionId={selectedVersionId}
              onRestored={closeHistory}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              No version selected. Versions are saved automatically before
              every AI edit.
            </div>
          )
        ) : null}
      </main>

      {/* Right panel: the AI chat (or, in history mode, the version list) */}
      <aside className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <div className={historyOpen ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
          <Chat roomId={roomId} />
        </div>
        {historyOpen ? (
          <VersionHistorySidebar
            selectedVersionId={selectedVersionId}
            onSelectVersion={setSelectedVersionId}
            onClose={closeHistory}
          />
        ) : null}
      </aside>
    </div>
  );
}
