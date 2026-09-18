"use client";

import { Plus, Workflow as WorkflowIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
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
    <main className="min-h-dvh bg-neutral-50 p-6 sm:p-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              Workflows
            </h1>
            <p className="text-sm text-neutral-500">
              Each workflow is a Liveblocks room.
            </p>
          </div>
          <button
            type="button"
            disabled={isCreating}
            onClick={() => startCreating(() => createWorkflowAction(exampleId))}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            <Plus className="size-4" />
            {isCreating ? "Creating…" : "New workflow"}
          </button>
        </header>

        <ul className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
          {workflows.map((workflow) => (
            <li
              key={workflow.workflowId}
              className="border-b border-neutral-100 last:border-b-0"
            >
              <Link
                href={`/w/${workflow.workflowId}${suffix}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                  <WorkflowIcon className="size-4" />
                </span>
                <span className="flex-1 truncate text-sm font-medium text-neutral-900">
                  {workflow.name}
                </span>
                <span className="text-xs text-neutral-400">
                  {formatRelative(
                    workflow.lastConnectionAt ?? workflow.createdAt
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
