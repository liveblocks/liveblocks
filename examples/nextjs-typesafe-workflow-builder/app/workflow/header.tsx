"use client";

import { AvatarStack } from "@liveblocks/react-ui";
import { ChevronDown, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { HelpButton } from "../../components/help-button";
import { createWorkflowAction, renameWorkflowAction } from "./actions";
import type { WorkflowSummary } from "./server/liveblocks";

const NEW_WORKFLOW_VALUE = "__new__";

export function WorkflowHeader({
  workflow,
  workflows,
  exampleId,
}: {
  workflow: WorkflowSummary;
  workflows: WorkflowSummary[];
  exampleId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(workflow.name);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(workflow.name);
  }, [workflow.name]);

  const search = searchParams.toString();
  const suffix = search ? `?${search}` : "";

  function commitName() {
    const next = name.trim() || "Untitled workflow";
    setName(next);

    if (next === workflow.name) {
      return;
    }

    startTransition(async () => {
      await renameWorkflowAction(workflow.workflowId, exampleId, next);
      router.refresh();
    });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4">
      <div className="relative">
        <select
          aria-label="Switch workflow"
          value={workflow.workflowId}
          onChange={(event) => {
            const value = event.target.value;

            if (value === NEW_WORKFLOW_VALUE) {
              startTransition(() => createWorkflowAction(exampleId));
              return;
            }

            router.push(`/w/${value}${suffix}`);
          }}
          className="h-8 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          {workflows.map((item) => (
            <option key={item.workflowId} value={item.workflowId}>
              {item.workflowId === workflow.workflowId ? name : item.name}
            </option>
          ))}
          <option value={NEW_WORKFLOW_VALUE}>+ New workflow</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
      </div>

      <input
        aria-label="Workflow name"
        value={name}
        disabled={isPending}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setName(workflow.name);
            event.currentTarget.blur();
          }
        }}
        className="h-8 min-w-0 flex-1 max-w-xs rounded-md border border-transparent bg-transparent px-2 text-sm font-medium text-neutral-900 hover:border-neutral-200 focus:border-neutral-300 focus:outline-none"
      />

      <div className="ml-auto flex items-center gap-2">
        <AvatarStack size={28} gap={3} max={5} />
        <button
          type="button"
          title="New workflow"
          aria-label="New workflow"
          disabled={isPending}
          onClick={() => startTransition(() => createWorkflowAction(exampleId))}
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
        >
          <Plus className="size-4" />
        </button>
        <HelpButton />
      </div>
    </header>
  );
}
