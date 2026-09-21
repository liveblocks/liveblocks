"use client";

import { ChevronRight, Plus, Workflow as WorkflowIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { HelpButton } from "../../components/help-button";
import { createWorkflowAction } from "./actions";
import type { WorkflowSummary } from "./server/liveblocks";

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);

  if (hours < 24) return `${hours} h ago`;

  return new Date(timestamp).toLocaleDateString();
}

export function WorkflowList({
  workflows,
  exampleId,
}: {
  workflows: WorkflowSummary[];
  exampleId: string | null;
}) {
  const searchParams = useSearchParams();
  const [isCreating, startCreating] = useTransition();
  const search = searchParams.toString();
  const suffix = search ? `?${search}` : "";

  return (
    <main className="workflow-library min-h-dvh">
      <nav className="library-nav" aria-label="Workspace">
        <div className="flex items-center gap-2">
          <span className="brand-mark !size-6 !rounded-md">
            <WorkflowIcon className="size-3.5" aria-hidden />
          </span>
          <span className="text-xs font-semibold tracking-tight">
            Workflows
          </span>
        </div>
        <HelpButton />
      </nav>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
              Workflows
            </h1>
            <span className="rounded bg-neutral-200/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-neutral-500">
              {workflows.length}
            </span>
          </div>
          <button
            type="button"
            disabled={isCreating}
            onClick={() => startCreating(() => createWorkflowAction(exampleId))}
            className="primary-button shrink-0"
          >
            <Plus className="size-3.5" />
            {isCreating ? "Creating…" : "New workflow"}
          </button>
        </header>

        <ul className="workflow-list">
          {workflows.map((workflow) => (
            <li
              key={workflow.workflowId}
              className="min-w-0 border-b border-neutral-100 last:border-b-0"
            >
              <Link
                href={`/w/${workflow.workflowId}${suffix}`}
                className="workflow-list-row group flex items-center gap-2.5 px-3 py-2"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                  <WorkflowIcon className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-900">
                  {workflow.name}
                </span>
                <span className="shrink-0 whitespace-nowrap text-[10px] text-neutral-500">
                  <span className="hidden sm:inline">
                    {workflow.lastConnectionAt ? "Opened " : "Created "}
                  </span>
                  {formatRelative(
                    workflow.lastConnectionAt ?? workflow.createdAt
                  )}
                </span>
                <ChevronRight
                  className="size-3 shrink-0 text-neutral-300 transition-colors group-hover:text-violet-600"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
