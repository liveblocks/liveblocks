"use client";

import clsx from "clsx";
import {
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  FilePenLineIcon,
  FileTextIcon,
  FolderIcon,
  GitPullRequestIcon,
  GlobeIcon,
  ListTodoIcon,
  Loader2Icon,
  PanelRightOpenIcon,
  SearchIcon,
  TerminalIcon,
  Trash2Icon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { CHANGES_TAB } from "@/components/chat-side-panel";
import { useSidePanel } from "@/components/side-panel";
import { Markdown } from "@/lib/markdown";
import type { AgentPart, DocumentChange } from "@/lib/types";

const TOOL_META: Record<string, { icon: typeof FileTextIcon; verb: string }> = {
  read: { icon: FileTextIcon, verb: "Read" },
  edit: { icon: FilePenLineIcon, verb: "Edited" },
  delete: { icon: Trash2Icon, verb: "Deleted" },
  shell: { icon: TerminalIcon, verb: "Ran" },
  search: { icon: SearchIcon, verb: "Searched" },
  list: { icon: FolderIcon, verb: "Listed" },
  plan: { icon: ListTodoIcon, verb: "Planned" },
  web: { icon: GlobeIcon, verb: "Fetched" },
  tool: { icon: WrenchIcon, verb: "Used" },
};

const RUNNING_VERBS: Record<string, string> = {
  read: "Reading",
  edit: "Editing",
  delete: "Deleting",
  shell: "Running",
  search: "Searching",
  list: "Listing",
  plan: "Planning",
  web: "Fetching",
  tool: "Using",
};

const COLLAPSE_THRESHOLD = 8;

type Segment =
  | { type: "tools"; parts: Extract<AgentPart, { type: "tool" }>[] }
  | { type: "part"; part: Exclude<AgentPart, { type: "tool" }> };

// Consecutive tool calls are rendered as one compact block
function segment(parts: AgentPart[]): Segment[] {
  const segments: Segment[] = [];
  for (const part of parts) {
    const last = segments[segments.length - 1];
    if (part.type === "tool") {
      if (last?.type === "tools") {
        last.parts.push(part);
      } else {
        segments.push({ type: "tools", parts: [part] });
      }
    } else {
      segments.push({ type: "part", part });
    }
  }
  return segments;
}

export function AgentParts({
  parts,
  running,
  holding = false,
}: {
  parts: AgentPart[];
  running: boolean;
  // Someone posted a follow-up while this reply was being written. The text
  // so far is a draft the agent will revise, so keep it out of view. The
  // workflow later drops it server-side too, so nothing changes visibly.
  holding?: boolean;
}) {
  const visibleParts =
    running && holding ? parts.filter((part) => part.type !== "text") : parts;
  const segments = segment(visibleParts);

  return (
    <div className="flex flex-col gap-2">
      {segments.map((item, index) => {
        if (item.type === "tools") {
          return <ToolGroup key={index} parts={item.parts} running={running} />;
        }

        const part = item.part;
        switch (part.type) {
          case "text":
            return <Markdown key={index} content={part.text} />;
          case "status":
            return (
              <div
                key={index}
                className="flex items-center gap-2 text-xs text-muted"
              >
                {running && index === segments.length - 1 ? (
                  <Loader2Icon className="size-3 animate-spin" />
                ) : (
                  <CheckIcon className="size-3 text-success" />
                )}
                {part.text}
              </div>
            );
          case "divider":
            return (
              <div key={index} className="flex items-center gap-2 py-1">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium text-subtle">
                  {part.text}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            );
          case "error":
            return (
              <div
                key={index}
                className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger"
              >
                <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                <span className="break-words">{part.text}</span>
              </div>
            );
        }
      })}
    </div>
  );
}

/** "3 mins 57 seconds", "1 min 2 seconds", "45 seconds" */
export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const secondsText = `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  if (minutes === 0) {
    return secondsText;
  }
  const minutesText = `${minutes} ${minutes === 1 ? "min" : "mins"}`;
  return seconds === 0 ? minutesText : `${minutesText} ${secondsText}`;
}

/**
 * Everything the agent does lives behind one line from the moment a run
 * starts: "Working…" while it runs, then "Worked for 3 mins 57 seconds".
 * Opening it shows the full log of steps, streaming in live. Only the
 * agent's closing summary is shown outside of it once the run finishes.
 */
export function WorkLog({
  parts,
  running,
  holding = false,
  durationMs,
  status,
  action,
}: {
  parts: AgentPart[];
  running: boolean;
  holding?: boolean;
  durationMs: number;
  status: "done" | "error";
  // Rendered after the label while running, e.g. a stop button
  action?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = running
    ? "Working…"
    : `${status === "error" ? "Stopped after" : "Worked for"} ${formatDuration(durationMs)}`;
  const canExpand = parts.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          disabled={!canExpand}
          aria-expanded={expanded}
          className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition enabled:hover:text-foreground disabled:cursor-default"
        >
          <ChevronRightIcon
            className={clsx(
              "size-3.5 transition-transform",
              expanded && "rotate-90",
              !canExpand && "opacity-40"
            )}
          />
          <span className={running ? "text-shimmer" : undefined}>{label}</span>
        </button>
        {running && action ? (
          <>
            <span aria-hidden className="text-subtle">
              •
            </span>
            {action}
          </>
        ) : null}
      </div>
      {expanded && canExpand ? (
        <div className="border-l-2 border-border pl-3">
          <AgentParts parts={parts} running={running} holding={holding} />
        </div>
      ) : null}
    </div>
  );
}

function ToolGroup({
  parts,
  running,
}: {
  parts: Extract<AgentPart, { type: "tool" }>[];
  running: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = parts.length > COLLAPSE_THRESHOLD;
  const visible =
    collapsible && !expanded ? parts.slice(-COLLAPSE_THRESHOLD + 2) : parts;
  const hidden = parts.length - visible.length;

  return (
    <div className="rounded-lg border border-border bg-panel/60 py-1">
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs text-muted hover:text-foreground"
        >
          <span className="w-4" />
          Show {hidden} earlier {hidden === 1 ? "step" : "steps"}
        </button>
      ) : null}
      {visible.map((part) => (
        <ToolRow key={part.callId} part={part} running={running} />
      ))}
    </div>
  );
}

function ToolRow({
  part,
  running,
}: {
  part: Extract<AgentPart, { type: "tool" }>;
  running: boolean;
}) {
  const meta = TOOL_META[part.name] ?? TOOL_META.tool;
  const Icon = meta.icon;
  // A tool can only still be running while the message itself is; older
  // messages may have been stored before their tool calls were settled.
  const isRunning = running && part.status === "running";
  const verb = isRunning ? (RUNNING_VERBS[part.name] ?? "Using") : meta.verb;

  let trailing: ReactNode;
  if (isRunning) {
    trailing = <Loader2Icon className="size-3 animate-spin text-muted" />;
  } else if (part.status === "error") {
    trailing = <XIcon className="size-3 text-danger" />;
  } else {
    trailing = null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 text-xs">
      <Icon className="size-3.5 shrink-0 text-muted" />
      <span className="shrink-0 text-muted">{verb}</span>
      {part.summary ? (
        <span
          className={clsx(
            "min-w-0 truncate font-mono text-[11.5px]",
            part.name === "shell" ? "text-foreground" : "text-foreground/90"
          )}
          title={part.summary}
        >
          {part.summary}
        </span>
      ) : (
        <span className="text-subtle">{part.name}</span>
      )}
      <span className="ml-auto shrink-0">{trailing}</span>
    </div>
  );
}

/**
 * A document the reply created or rewrote. Clicking opens it in the side
 * panel, where it's read live from Storage.
 */
export function DocumentCard({ change }: { change: DocumentChange }) {
  const panel = useSidePanel();

  return (
    <button
      type="button"
      onClick={() => panel?.open(change.key)}
      className="mt-1 flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:bg-panel-hover"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-foreground">
        <FileTextIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">
          {change.title}
        </span>
        <span className="block truncate text-[11px] text-muted">
          {change.action === "created"
            ? "Document created"
            : "Document updated"}
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted">Open</span>
    </button>
  );
}

/** Why a message shows its pull request card */
export type GitCardKind = "opened" | "updated";

export function PullRequestCard({
  prUrl,
  branch,
  repoName,
  kind,
}: {
  prUrl?: string;
  branch?: string;
  repoName: string;
  kind: GitCardKind;
}) {
  const panel = useSidePanel();

  if (!prUrl && !branch) {
    return null;
  }

  const title = prUrl
    ? kind === "opened"
      ? "Pull request opened"
      : "Pull request updated"
    : kind === "opened"
      ? "Branch pushed"
      : "Branch updated";

  return (
    <div
      className={clsx(
        "mt-4 border border-border bg-background",
        prUrl ? "rounded-2xl px-4 py-4" : "rounded-lg px-4 py-2"
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="mt-0.5 flex items-center gap-1 truncate font-mono text-xs text-muted">
          <GitPullRequestIcon
            className={clsx(
              "size-3 shrink-0",
              prUrl ? "text-success" : "text-muted"
            )}
          />
          {branch || ""}
        </div>
      </div>
      {prUrl ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => panel?.open(CHANGES_TAB)}
            className="font-semibold inline-flex w-fit items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs text-background transition hover:opacity-90"
          >
            Open PR
          </button>
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-panel-hover"
          >
            <GitHubIcon />
            View on GitHub
          </a>
        </div>
      ) : null}
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
