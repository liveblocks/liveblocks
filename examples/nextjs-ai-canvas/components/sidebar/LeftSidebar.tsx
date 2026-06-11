"use client";

import clsx from "clsx";
import { useMutation, useSelf, useStorage } from "@liveblocks/react/suspense";
import { ChevronDown, Link2, Settings } from "lucide-react";
import { useState } from "react";
import { type Editor } from "tldraw";
import { AgentTab } from "./AgentTab";
import { ComponentsTab } from "./ComponentsTab";

type Tab = "agent" | "components" | "libraries";

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
  const canWrite = useSelf((me) => me.canWrite);
  const storyTitle = useStorage((root) => root.story.title) || "Untitled Story";
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(storyTitle);

  const setStoryTitle = useMutation(({ storage }, nextTitle: string) => {
    if (!canWrite) {
      return;
    }
    storage.get("story").set("title", nextTitle);
  }, [canWrite]);

  return (
    <aside className="z-20 flex h-full w-[400px] shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-5">
        <div className="mb-2 flex items-center gap-1">
          <div className="grid h-6 w-6 place-items-center text-gray-700">
            <svg
              viewBox="0 0 32 32"
              aria-label="Liveblocks"
              className="size-6.5"
            >
              <path
                clipRule="evenodd"
                d="M21.657 8H2l5.657 5.6v7.733L21.657 8ZM10.343 24H30l-5.657-5.6v-7.733L10.343 24Z"
                fill="currentColor"
                fillRule="evenodd"
              ></path>
            </svg>
          </div>
          <ChevronDown size={14} className="text-neutral-400" />
        </div>
        <div className="*:-ml-1.5 *:inline-flex *:items-center *:gap-1 *:rounded-sm *:px-1.5 *:py-1 text-[14px] *:font-medium leading-tight tracking-normal text-neutral-900">
          {isEditingTitle ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={() => {
                const nextTitle = draftTitle.trim() || "Untitled Story";
                setStoryTitle(nextTitle);
                setIsEditingTitle(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const nextTitle = draftTitle.trim() || "Untitled Story";
                  setStoryTitle(nextTitle);
                  setIsEditingTitle(false);
                } else if (event.key === "Escape") {
                  setDraftTitle(storyTitle);
                  setIsEditingTitle(false);
                }
              }}
              className="fit-content outline-none ring-3 ring-sky-200 focus:bg-neutral-50 focus:ring-3 focus:ring-neutral-400"
            />
          ) : (
            <button
              className="hover:bg-neutral-50"
              onClick={() => {
                setDraftTitle(storyTitle);
                setIsEditingTitle(true);
              }}
            >
              {storyTitle}
              <ChevronDown size={14} className="text-neutral-400" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-neutral-400">My files</p>
      </div>

      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3.5 py-2.5">
        <div className="flex gap-1">
          <TabButton
            active={activeTab === "agent"}
            onClick={() => setActiveTab("agent")}
          >
            Agent
          </TabButton>
          <TabButton
            active={activeTab === "components"}
            onClick={() => setActiveTab("components")}
          >
            Components
          </TabButton>
          <TabButton
            active={activeTab === "libraries"}
            onClick={() => setActiveTab("libraries")}
          >
            Libraries
          </TabButton>
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <button className="rounded-sm p-1 hover:bg-neutral-50">
            <Settings size={14} />
          </button>
          <button className="rounded-sm p-1 hover:bg-neutral-50">
            <Link2 size={14} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-white">
        {activeTab === "agent" ? (
          <AgentTab fileId={fileId} roomId={roomId} editor={editor} />
        ) : activeTab === "components" ? (
          <ComponentsTab editor={editor} />
        ) : (
          <div className="p-4 text-sm text-neutral-500">No libraries yet.</div>
        )}
      </div>
    </aside>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-md px-2 py-[3px] text-[13px] font-medium transition",
        active
          ? "bg-neutral-100 text-neutral-800"
          : "bg-transparent text-neutral-500 hover:bg-neutral-50"
      )}
    >
      {children}
    </button>
  );
}
