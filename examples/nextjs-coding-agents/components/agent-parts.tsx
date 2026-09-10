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
  SearchIcon,
  TerminalIcon,
  Trash2Icon,
  WrenchIcon,
  XIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Markdown } from "@/lib/markdown";
import type { AgentPart } from "@/lib/types";

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
      <div className="flex items-center gap-2 text-xs text-muted">
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
          {running ? <Loader2Icon className="size-3 animate-spin" /> : null}
          {label}
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

  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
        <GitPullRequestIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{title}</span>
        <span className="block truncate font-mono text-[11px] text-muted">
          {branch || ""}
        </span>
      </span>
    </>
  );

  return prUrl ? (
    <a
      href={prUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 transition hover:bg-panel-hover"
    >
      {content}
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
        View on GitHub <ExternalLinkIcon className="size-3 shrink-0 -mt-px" />
      </span>
    </a>
  ) : (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      {content}
    </div>
  );
}
