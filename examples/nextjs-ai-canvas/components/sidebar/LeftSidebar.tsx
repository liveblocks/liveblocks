"use client";

import clsx from "clsx";
import { useState } from "react";
import { type Editor } from "tldraw";
import { AgentTab } from "./AgentTab";
import { ComponentsTab } from "./ComponentsTab";

type Tab = "agent" | "components";

export function LeftSidebar({
  fileId,
  roomId,
  editor,
}: {
  fileId: string;
  roomId: string;
  editor: Editor | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("agent");

  return (
    <aside className="z-20 flex h-full w-[320px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
      <div className="flex border-b border-neutral-200 bg-white p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("agent")}
          className={clsx(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
            activeTab === "agent"
              ? "bg-violet-600 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          Agent
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("components")}
          className={clsx(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
            activeTab === "components"
              ? "bg-violet-600 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          Components
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "agent" ? (
          <AgentTab fileId={fileId} roomId={roomId} editor={editor} />
        ) : (
          <ComponentsTab editor={editor} />
        )}
      </div>
    </aside>
  );
}
