"use client";

import { useSelf } from "@liveblocks/react/suspense";
import Editor from "./lexical/editor";
import Notifications from "./notifications";

export default function Room() {
  const self = useSelf();

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex flex-row items-center justify-end h-[50px] w-full px-4 border-b">
        <div className="mr-5 text-xs font-medium">{self.info?.name}</div>

        <Notifications />
      </div>

      <div className="h-[calc(100vh-50px)]">
        <Editor />
      </div>
    </div>
  );
}
