"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { DocumentSpinner } from "@/components/spinner";
import { Avatars } from "@/components/avatars";
import { AdvancedEditor } from "@/components/editor/advanced-editor";
import { ThemeToggle } from "@/components/theme-toggle";
import { Room } from "./room";

export default function Page() {
  return (
    <Room>
      <div className="flex flex-col bg-border/30 absolute inset-0">
        <div className="top-0 left-0 right-0 flex flex-none justify-between items-start bg-background border-b border-border p-1.5 z-10">
          <ThemeToggle />
          <ClientSideSuspense fallback={null}>
            <Avatars />
          </ClientSideSuspense>
        </div>
        <div className="flex-1 overflow-y-scroll">
          <div className="min-h-0 h-auto xl:ml-[-350px] ml-0 px-4">
            <div className="relative min-h-[1100px] w-full max-w-[800px] my-4 mx-auto border border-border bg-background">
              <ClientSideSuspense fallback={<DocumentSpinner />}>
                <AdvancedEditor />
              </ClientSideSuspense>
            </div>
          </div>
        </div>
      </div>
    </Room>
  );
}
