import { notFound } from "next/navigation";
import { WorkflowApp } from "../../workflow/workflow-app";
import { getRoomId, getWorkflow } from "../../workflow/server/liveblocks";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string): string | null {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function WorkflowPage({
  params,
  searchParams,
}: {
  params: Promise<{ workflowId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { workflowId } = await params;
  const search = await searchParams;
  // Used when deploying an example on liveblocks.io. Ignore locally.
  const exampleId = getParam(search, "exampleId");

  const workflow = await getWorkflow(workflowId, exampleId);

  if (!workflow) {
    notFound();
  }

  return (
    <WorkflowApp
      roomId={getRoomId(workflowId, exampleId)}
      workflow={workflow}
      exampleId={exampleId}
    />
  );
}
