"use server";

import { redirect } from "next/navigation";
import {
  createWorkflow,
  listWorkflows,
  renameWorkflow,
  type WorkflowSummary,
} from "./server/liveblocks";

function workflowHref(workflowId: string, exampleId: string | null) {
  const search = exampleId
    ? `?${new URLSearchParams({ exampleId }).toString()}`
    : "";
  return `/w/${workflowId}${search}`;
}

export async function createWorkflowAction(
  exampleId: string | null
): Promise<void> {
  const workflow = await createWorkflow(exampleId, {
    name: "Untitled workflow",
  });
  redirect(workflowHref(workflow.workflowId, exampleId));
}

export async function renameWorkflowAction(
  workflowId: string,
  exampleId: string | null,
  name: string
): Promise<void> {
  await renameWorkflow(workflowId, exampleId, name);
}

export async function listWorkflowsAction(
  exampleId: string | null
): Promise<WorkflowSummary[]> {
  return listWorkflows(exampleId);
}
