"use client";

import { ClientSideSuspense, useThreads } from "@liveblocks/react/suspense";
import { MessageCircleIcon, SlidersHorizontalIcon } from "lucide-react";
import { CommentsPanel } from "@/components/comments/comments-panel";
import { useEditorUi } from "@/components/editor-context";
import { Inspector } from "@/components/inspector/inspector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SidePanel() {
  const { sidePanelTab, setSidePanelTab } = useEditorUi();

  return (
    <Tabs
      value={sidePanelTab}
      onValueChange={(value) =>
        setSidePanelTab(value === "comments" ? "comments" : "inspector")
      }
      className="h-full"
    >
      <div className="shrink-0 px-3 pt-3 pb-2">
        <TabsList className="w-full">
          <TabsTrigger value="inspector">
            <SlidersHorizontalIcon />
            Inspector
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageCircleIcon />
            Comments
            <ClientSideSuspense fallback={null}>
              <OpenThreadCount />
            </ClientSideSuspense>
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="inspector" className="flex flex-col overflow-hidden">
        <Inspector />
      </TabsContent>
      <TabsContent value="comments" className="flex flex-col overflow-hidden">
        <ClientSideSuspense fallback={<CommentsLoading />}>
          <CommentsPanel />
        </ClientSideSuspense>
      </TabsContent>
    </Tabs>
  );
}

function OpenThreadCount() {
  const { threads } = useThreads({ query: { resolved: false } });
  if (threads.length === 0) return null;
  return (
    <span className="min-w-4 rounded-full bg-brand px-1 text-[10px] leading-4 font-semibold text-white tabular">
      {threads.length}
    </span>
  );
}

function CommentsLoading() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[0, 1].map((key) => (
        <div key={key} className="flex gap-2.5">
          <div className="size-7 shrink-0 animate-pulse rounded-full bg-neutral-100" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
