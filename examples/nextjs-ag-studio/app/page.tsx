"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { Loader2Icon } from "lucide-react";
import dynamic from "next/dynamic";
import { HelpButton } from "@/components/help-button";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { INITIAL_REPORT_STATE } from "./initial-report";
import { reportToInitialStorage } from "./report-sync";

// AG Studio renders straight into the DOM, so it must only load in the browser.
const CollaborativeStudio = dynamic(() => import("./studio"), { ssr: false });

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={() => reportToInitialStorage(INITIAL_REPORT_STATE)}
    >
      <div className="flex h-dvh flex-col gap-2.5 bg-neutral-50 p-2.5">
        <header className="flex shrink-0 items-center justify-end py-0.5 pr-1">
          <div className="flex items-center gap-2">
            <ClientSideSuspense fallback={null}>
              <AvatarStack size={28} />
            </ClientSideSuspense>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          <ClientSideSuspense fallback={<Loading />}>
            <CollaborativeStudio />
          </ClientSideSuspense>
        </main>
      </div>
      <HelpButton />
    </RoomProvider>
  );
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-neutral-400">
      <Loader2Icon className="size-5 animate-spin" />
    </div>
  );
}
