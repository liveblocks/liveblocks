"use client";

import { Calendar } from "./_components/calendar";
import { Room } from "./_components/room";
import { Chat } from "./_components/chat";

export default function Page({ params }: { params: { chatId: string } }) {
  return (
    <Room chatId={params.chatId}>
      <div className="flex justify-center items-center h-full w-full p-2.5 gap-2.5 overflow-hidden">
        <main className="grow flex gap-2.5 min-h-0 max-w-[1100px] max-h-[625px]">
          <div className="relative grow shadow rounded-xl overflow-hidden ring-1 ring-neutral-950/5 bg-white flex flex-col">
            <div className="flex items-center justify-between pr-4 border-b border-neutral-950/5">
              <div className="flex items-center p-2.5 gap-1.5 ">
                <div className="text-sm font-medium py-1 px-2 rounded text-neutral-800">
                  August
                </div>
              </div>
            </div>

            <div className="grow relative shrink">
              <div>
                <Calendar />
              </div>
            </div>
          </div>
          <div className="grow-0 w-[340px] shadow rounded-lg overflow-hidden ring-1 ring-neutral-950/5 bg-white shrink-0 max-h-full">
            <Chat chatId={params.chatId} />
          </div>
        </main>
      </div>
    </Room>
  );
}
