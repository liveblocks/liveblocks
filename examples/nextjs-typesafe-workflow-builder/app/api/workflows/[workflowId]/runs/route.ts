import { after, NextRequest, NextResponse } from "next/server";
import type { RunTrigger } from "../../../../workflow/runs";
import { startWorkflowRun } from "../../../../workflow/server/executor";
import { getRoomId, getWorkflow } from "../../../../workflow/server/liveblocks";

// Runs can take a while when several LLM nodes chain.
export const maxDuration = 120;

/**
 * Triggers a workflow run.
 *
 *   POST /api/workflows/<workflowId>/runs
 *   { "input": "text to evaluate" }
 *
 * Responds `202 { runId }` immediately while the run streams into a
 * Liveblocks feed in the workflow's room. Add `?wait=true` to block until the
 * run finishes and get `{ output: string[], nodes, ... }` back as JSON.
 *
 * `exampleId` is only used when this example is embedded on liveblocks.io.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return NextResponse.json(
      { error: "Missing LIVEBLOCKS_SECRET_KEY" },
      { status: 403 }
    );
  }

  const { workflowId } = await params;
  const exampleId = request.nextUrl.searchParams.get("exampleId");
  const wait = ["1", "true"].includes(
    request.nextUrl.searchParams.get("wait") ?? ""
  );

  let body: { input?: unknown; trigger?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: 'Body must be JSON: { "input": string }' },
      { status: 400 }
    );
  }

  if (typeof body.input !== "string" || body.input.trim() === "") {
    return NextResponse.json(
      { error: "`input` must be a non-empty string" },
      { status: 400 }
    );
  }

  if (body.input.length > 20_000) {
    return NextResponse.json(
      { error: "`input` must be under 20,000 characters" },
      { status: 413 }
    );
  }

  const workflow = await getWorkflow(workflowId, exampleId);

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const trigger: RunTrigger = body.trigger === "test" ? "test" : "api";
  const roomId = getRoomId(workflowId, exampleId);
  const { runId, trace$ } = startWorkflowRun({
    roomId,
    input: body.input,
    trigger,
  });

  if (wait) {
    const trace = await trace$;
    return NextResponse.json(trace, {
      status: trace.status === "error" ? 500 : 200,
    });
  }

  // Respond right away; `after` keeps the function alive until the run has
  // finished writing into the feed. Errors are recorded in the feed metadata.
  after(() =>
    trace$.catch((error) => console.error("Workflow run failed", error))
  );

  return NextResponse.json({ runId, status: "running" }, { status: 202 });
}
