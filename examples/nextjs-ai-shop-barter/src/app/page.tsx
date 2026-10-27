"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProductDisplay } from "../components/ProductDisplay";
import { Chat } from "../components/Chat";

export default function Page() {
  return (
    <div className="flex gap-4 w-full mx-auto h-full">
      <div className="grow flex justify-center">
        <div className="max-w-[900px] xl:mr-[-100px] 2xl:mr-[-175px]">
          <ProductDisplay />
        </div>
      </div>
      <div className="w-[350px] border-l border-gray-200 shrink-0">
        <Chat />
      </div>
    </div>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
