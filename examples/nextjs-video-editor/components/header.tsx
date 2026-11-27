"use client";

import { useSyncStatus } from "@liveblocks/react/suspense";
import {
  CheckIcon,
  CloudIcon,
  LinkIcon,
  LoaderIcon,
  PanelLeftIcon,
  PanelRightIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Collaborators } from "@/components/collaborators";
import { HelpButton } from "@/components/help-button";
import { Button } from "@/components/ui/button";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useEditorActions, useProject } from "@/hooks/use-editor";

export function Header({
  libraryOpen,
  onLibraryOpenChange,
  sidePanelOpen,
  onSidePanelOpenChange,
}: {
  libraryOpen: boolean;
  onLibraryOpenChange: (open: boolean) => void;
  sidePanelOpen: boolean;
  onSidePanelOpenChange: (open: boolean) => void;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-white"
          aria-hidden
        >
          <LiveblocksMark className="w-[55%]" />
        </span>
        <span className="hidden text-[13px] font-medium text-neutral-500 sm:inline">
          Projects
        </span>
        <span className="hidden text-neutral-300 sm:inline" aria-hidden>
          /
        </span>
        <ProjectName />
        <SyncStatus />
      </div>

      <div className="flex items-center gap-1">
        <TooltipButton
          label={libraryOpen ? "Hide library" : "Show library"}
          aria-pressed={libraryOpen}
          onClick={() => onLibraryOpenChange(!libraryOpen)}
        >
          <PanelLeftIcon />
        </TooltipButton>
        <TooltipButton
          label={sidePanelOpen ? "Hide inspector" : "Show inspector"}
          aria-pressed={sidePanelOpen}
          onClick={() => onSidePanelOpenChange(!sidePanelOpen)}
        >
          <PanelRightIcon />
        </TooltipButton>
      </div>

      <div className="mx-1 h-5 w-px bg-neutral-950/10" />

      <Collaborators />

      <ShareButton />
      <HelpButton />
    </header>
  );
}

/** The project name, editable in place by anyone. */
function ProjectName() {
  const project = useProject();
  const { updateProject } = useEditorActions();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? project.name;

  return (
    <input
      aria-label="Project name"
      value={value}
      size={Math.max(4, value.length)}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => {
        setDraft(project.name);
        event.target.select();
      }}
      onBlur={() => {
        const name = draft?.trim();
        if (name && name !== project.name) {
          updateProject({ name });
        }
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(project.name);
          requestAnimationFrame(() => event.currentTarget?.blur());
        }
      }}
      className="min-w-0 truncate rounded-md px-1.5 py-1 text-[13px] font-semibold text-neutral-900 outline-none hover:bg-neutral-950/5 focus:bg-white focus:ring-2 focus:ring-ring"
    />
  );
}

/**
 * Like `useSyncStatus({ smooth: true })`, which can stay on "synchronizing" if
 * the room finishes syncing before its listener subscribes.
 */
function useSmoothSaving() {
  const synchronizing = useSyncStatus() === "synchronizing";
  const [saving, setSaving] = useState(synchronizing);

  useEffect(() => {
    if (synchronizing) {
      setSaving(true);
      return;
    }
    const timeout = setTimeout(() => setSaving(false), 1000);
    return () => clearTimeout(timeout);
  }, [synchronizing]);

  return saving;
}

/** "Saving…" while local changes are on their way, "Saved" once they're in. */
function SyncStatus() {
  const saving = useSmoothSaving();

  return (
    <span className="hidden items-center gap-1 text-xs text-neutral-400 md:flex">
      {saving ? (
        <LoaderIcon className="size-3.5 animate-spin" />
      ) : (
        <span className="relative">
          <CloudIcon className="size-3.5" />
          <CheckIcon
            className="absolute top-[5px] left-[4px] size-[7px]"
            strokeWidth={4}
          />
        </span>
      )}
      {saving ? "Saving…" : "Saved"}
    </span>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <Button
      size="sm"
      variant="default"
      className="ml-1 h-7 gap-1.5 px-2.5 text-xs"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(window.location.href)
          .then(() => setCopied(true));
      }}
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <LinkIcon className="size-3.5" />
      )}
      {copied ? "Copied" : "Share"}
    </Button>
  );
}

export function LiveblocksMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="768 320 264 160"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M954 320H768L821 376V453L954 320ZM847 480H1032L979 424V347L847 480Z"
      />
    </svg>
  );
}
