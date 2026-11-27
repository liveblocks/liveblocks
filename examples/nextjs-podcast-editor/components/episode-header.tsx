"use client";

import {
  useCanRedo,
  useCanUndo,
  useMutation,
  useRedo,
  useStorage,
  useThreads,
  useUndo,
} from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { MessageSquareTextIcon, Redo2Icon, Undo2Icon } from "lucide-react";
import { formatTime } from "@/lib/format";
import { EPISODE_NUMBER, SHOW_NAME } from "@/lib/transcript";
import { BrandMark } from "./brand";
import { useEditor } from "./editor-context";
import { ExportDialog } from "./export-dialog";
import { HelpButton } from "./help-button";
import { Button } from "./ui/button";
import { WithTooltip } from "./ui/tooltip";

/** The episode title (shared), undo/redo, who's here, and export. */
export function EpisodeHeader({ panelDocked }: { panelDocked: boolean }) {
  const { timeline, setPanelOpen } = useEditor();
  const title = useStorage((root) => root.episode.title);
  const { threads } = useThreads();
  const openCount = threads.filter((thread) => !thread.resolved).length;
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const setTitle = useMutation(({ storage }, value: string) => {
    storage.get("episode").set("title", value);
  }, []);

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-neutral-950/5 px-3 py-2.5 sm:px-4">
      <BrandMark className="hidden sm:flex xl:hidden" />

      <div className="min-w-0 flex-1">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur();
            }
          }}
          placeholder="Untitled episode"
          aria-label="Episode title"
          className="-mx-1.5 block h-7 w-full max-w-md truncate rounded-md bg-transparent px-1.5 text-[15px] font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 hover:bg-neutral-100 focus:bg-white focus:ring-2 focus:ring-ring"
        />
        <p className="truncate text-xs text-neutral-500">
          {SHOW_NAME} · Episode {EPISODE_NUMBER} ·{" "}
          <span className="tabular-nums">{formatTime(timeline.duration)}</span>
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        <WithTooltip label="Undo" shortcut="⌘Z">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-neutral-500"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
          >
            <Undo2Icon />
          </Button>
        </WithTooltip>
        <WithTooltip label="Redo" shortcut="⇧⌘Z">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-neutral-500"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
          >
            <Redo2Icon />
          </Button>
        </WithTooltip>
      </div>

      <div className="hidden sm:block">
        <AvatarStack size={28} max={4} />
      </div>

      <div className="xl:hidden">
        <HelpButton />
      </div>

      {panelDocked ? null : (
        <WithTooltip label="Comments and chapters">
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative text-neutral-500"
            onClick={() => setPanelOpen(true)}
            aria-label="Comments and chapters"
          >
            <MessageSquareTextIcon />
            {openCount > 0 ? (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-400 ring-2 ring-white" />
            ) : null}
          </Button>
        </WithTooltip>
      )}

      <ExportDialog />
    </header>
  );
}
