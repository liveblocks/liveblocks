"use client";

import { useThreads } from "@liveblocks/react/suspense";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChaptersPanel } from "./chapters-panel";
import { CommentsPanel } from "./comments-panel";
import { useEditor } from "./editor-context";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

/** Comments and chapters, docked beside the editor or as a slide-over. */
export function SidePanel({
  className,
  onClose,
}: {
  className?: string;
  onClose?: () => void;
}) {
  const { panel, setPanel } = useEditor();
  const { threads } = useThreads();
  const openCount = threads.filter((thread) => !thread.resolved).length;

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-950/5",
        className
      )}
    >
      <Tabs
        value={panel}
        onValueChange={(value) =>
          setPanel(value === "chapters" ? "chapters" : "comments")
        }
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex items-center gap-2 border-b border-neutral-950/5 px-3 py-2">
          <TabsList className="flex-1">
            <TabsTrigger value="comments">
              Comments
              {openCount > 0 ? (
                <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800 tabular-nums">
                  {openCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
          </TabsList>
          {onClose ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-neutral-500"
              onClick={onClose}
              aria-label="Close panel"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
        <TabsContent value="comments" className="flex min-h-0 flex-1 flex-col">
          <CommentsPanel />
        </TabsContent>
        <TabsContent value="chapters" className="flex min-h-0 flex-1 flex-col">
          <ChaptersPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
