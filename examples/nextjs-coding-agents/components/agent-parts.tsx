"use client";

import clsx from "clsx";
import {
  CheckIcon,
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
  const last = visibleParts[visibleParts.length - 1];
  const showWorking =
    running &&
    !holding &&
    (!last || last.type === "tool" || last.type === "divider");

  return (
    <div className="flex flex-col gap-2">
      {segments.map((item, index) => {
        if (item.type === "tools") {
          return <ToolGroup key={index} parts={item.parts} />;
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

      {showWorking ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2Icon className="size-3 animate-spin" />
          Working…
        </div>
      ) : null}

      {running && holding ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2Icon className="size-3 animate-spin" />
          Follow-up received — finishing the current task, then revising the
          reply before posting
        </div>
      ) : null}
    </div>
  );
}

function ToolGroup({
  parts,
}: {
  parts: Extract<AgentPart, { type: "tool" }>[];
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
        <ToolRow key={part.callId} part={part} />
      ))}
    </div>
  );
}

function ToolRow({ part }: { part: Extract<AgentPart, { type: "tool" }> }) {
  const meta = TOOL_META[part.name] ?? TOOL_META.tool;
  const Icon = meta.icon;
  const verb =
    part.status === "running"
      ? (RUNNING_VERBS[part.name] ?? "Using")
      : meta.verb;

  let trailing: ReactNode;
  if (part.status === "running") {
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

export function PullRequestCard({
  prUrl,
  branch,
  repoName,
}: {
  prUrl?: string;
  branch?: string;
  repoName: string;
}) {
  if (!prUrl && !branch) {
    return null;
  }

  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
        <GitPullRequestIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">
          {prUrl ? "Pull request opened" : "Branch pushed"}
        </span>
        <span className="block truncate font-mono text-[11px] text-muted">
          {repoName}
          {branch ? ` · ${branch}` : ""}
        </span>
      </span>
    </>
  );

  return prUrl ? (
    <a
      href={prUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 transition hover:bg-panel-hover"
    >
      {content}
      <span className="shrink-0 text-xs text-muted">View on GitHub ↗</span>
    </a>
  ) : (
    <div className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      {content}
    </div>
  );
}
