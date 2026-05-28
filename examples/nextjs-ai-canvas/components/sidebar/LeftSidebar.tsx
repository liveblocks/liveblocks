"use client";

import clsx from "clsx";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
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
  const storyTitle =
    useStorage((root) => root.story.title) || "Untitled Story";
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(storyTitle);

  const setStoryTitle = useMutation(({ storage }, nextTitle: string) => {
    storage.get("story").set("title", nextTitle);
  }, []);

  return (
    <aside className="z-20 flex h-full w-[400px] shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-3 py-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
            <svg
              viewBox="0 0 72 72"
              aria-label="Liveblocks"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M86 10h-8v50h8V10Zm16 14h-8v36h8V24Zm0-15h-8v9h8V9Zm13 15h-9l12 36h10l13-36h-9l-9 28-8-28Zm44-1c-11 0-18 8-18 19s7 19 18 19c8 0 15-4 17-13h-8c-1 4-5 6-9 6-6 0-9-3-9-10h27c0-10-6-21-18-21Zm0 7c5 0 9 3 9 8h-18c0-5 4-8 9-8Zm42-7c-4 0-8 2-11 6V10h-8v50h8v-5c3 4 7 6 11 6 11 0 16-9 16-19s-5-19-16-19Zm-2 32c-7 0-9-7-9-13s2-13 9-13 9 7 9 13-2 13-9 13Zm32-45h-8v50h8V10Zm24 51c11 0 18-8 18-19s-8-19-18-19c-11 0-19 8-19 19s7 19 19 19Zm0-6c-8 0-10-7-10-13s2-13 10-13c7 0 9 7 9 13s-2 13-9 13Zm39 6c8 0 15-4 17-12l-8-1c-2 4-4 6-9 6-7 0-9-6-9-12s2-12 9-12c5 0 8 3 8 7l9-1c-2-8-9-13-17-13-11 0-18 9-18 19 0 11 7 19 18 19Zm30-14 4-4 10 17h10l-15-23 15-13h-11l-13 13V10h-9v50h9V47Zm39 14c8 0 16-3 16-12 0-8-8-10-15-11-2-1-7-1-7-5 0-3 3-4 6-4 4 0 7 3 7 7l8-1c-1-9-8-12-15-12s-15 3-15 11 9 10 15 11c3 1 8 2 8 5 0 4-4 5-7 5-5 0-8-3-9-7l-8 1c1 8 9 12 16 12ZM41 27H0l12 12v17l29-29ZM20 60h40L48 48V32L20 60Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <ChevronDown size={14} className="text-neutral-400" />
        </div>
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
            className="-ml-1 w-[calc(100%+0.25rem)] rounded-sm bg-white px-2 py-1 text-[15px] font-medium leading-tight tracking-normal text-neutral-900 outline-none ring-0 focus:bg-neutral-50"
          />
        ) : (
          <button
            className="-ml-1 inline-flex items-center gap-1 rounded-sm px-2 py-1 text-left text-[15px] font-medium leading-tight tracking-normal text-neutral-900"
            onClick={() => {
              setDraftTitle(storyTitle);
              setIsEditingTitle(true);
            }}
          >
            {storyTitle}
            <ChevronDown size={14} className="text-neutral-400" />
          </button>
        )}
        <p className="mt-1 text-xs text-neutral-400">My files</p>
      </div>

      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-2 py-2.5">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("agent")}
            className={clsx(
              "rounded-md px-2.5 py-0.5 text-[13px] font-medium transition",
              activeTab === "agent"
                ? "bg-neutral-100 text-neutral-900"
                : "bg-transparent text-neutral-500 hover:bg-neutral-100"
            )}
          >
            Agent
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("components")}
            className={clsx(
              "rounded-md px-2.5 py-0.5 text-[13px] font-medium transition",
              activeTab === "components"
                ? "bg-neutral-100 text-neutral-900"
                : "bg-transparent text-neutral-500 hover:bg-neutral-100"
            )}
          >
            Components
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("libraries")}
            className={clsx(
              "rounded-md px-2.5 py-0.5 text-[13px] font-medium transition",
              activeTab === "libraries"
                ? "bg-neutral-100 text-neutral-900"
                : "bg-transparent text-neutral-500 hover:bg-neutral-100"
            )}
          >
            Libraries
          </button>
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <button className="rounded-sm p-1 hover:bg-neutral-100">
            <Settings size={14} />
          </button>
          <button className="rounded-sm p-1 hover:bg-neutral-100">
            <Link2 size={14} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-neutral-50">
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
