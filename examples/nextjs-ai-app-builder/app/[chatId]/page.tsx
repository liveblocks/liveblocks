"use client";

import { useAiChatStatus } from "@liveblocks/react";

import { Room } from "./_components/room";
import { Editor } from "./_components/editor";
import { Header } from "./_components/header";
import { Chat } from "./_components/chat";
import { Preview } from "./_components/preview";
import { useState } from "react";

export default function Page({ params }: { params: { chatId: string } }) {
  const [panel, setPanel] = useState<"preview" | "editor">("preview");
  const { status, toolName } = useAiChatStatus(params.chatId);

  return (
    <Room chatId={params.chatId}>
      <div className="flex flex-col h-full w-full gap-2.5 overflow-hidden">
        <header>
          <Header chatId={params.chatId} />
        </header>

        <main className="grow flex  min-h-0">
          <div className="grow-0 w-[380px] rounded-lg overflow-hidden">
            {/* <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-white to-transparent"></div> */}
            <Chat chatId={params.chatId} />
          </div>

          <div className="mb-2.5 mr-2.5 relative grow shadow rounded-lg overflow-hidden ring-1 ring-neutral-950/5 bg-white flex flex-col">
            <div className="flex items-center justify-between pr-4 border-b border-neutral-950/5">
              <div className="flex items-center p-2.5 gap-1.5">
                <button
                  className="text-sm font-medium py-1 px-2 rounded hover:bg-neutral-100 text-neutral-600 data-[selected]:text-neutral-900 data-[selected]:bg-neutral-100 transition-colors"
                  data-selected={panel === "preview" || undefined}
                  onClick={() => setPanel("preview")}
                >
                  Preview
                </button>
                <button
                  className="text-sm font-medium py-1 px-2 rounded hover:bg-neutral-100 text-neutral-600 data-[selected]:text-neutral-900 data-[selected]:bg-neutral-100 transition-colors"
                  data-selected={panel === "editor" || undefined}
                  onClick={() => setPanel("editor")}
                >
                  Editor
                </button>
              </div>
              {status === "generating" && toolName === "edit-code" ? (
                <div className="float-right text-neutral-600 text-sm animate-pulse">
                  Generating…
                </div>
              ) : (
                <div className="float-right text-neutral-300 text-sm">
                  Completed
                </div>
              )}
            </div>

            <div className="grow relative">
              <div
                style={{
                  display: panel === "preview" ? "block" : "none",
                  // opacity: generating ? 0.7 : 1,
                }}
              >
                <Preview chatId={params.chatId} />
              </div>
              <div
                style={{
                  display: panel === "editor" ? "block" : "none",
                }}
              >
                <Editor chatId={params.chatId} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </Room>
  );
}
