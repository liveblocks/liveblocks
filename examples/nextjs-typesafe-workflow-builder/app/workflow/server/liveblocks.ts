import "server-only";

import { Liveblocks } from "@liveblocks/node";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { nanoid } from "nanoid";
import { createDemoWorkflow, DEMO_WORKFLOW_NAME } from "../demo";
import {
  EXAMPLE_ID,
  FLOW_STORAGE_KEY,
  ROOM_ID_PREFIX,
  type WorkflowEdge,
  type WorkflowNode,
} from "../shared";

export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // Only set when running against the local Liveblocks dev server.
  baseUrl: process.env.LIVEBLOCKS_BASE_URL,
});

export type WorkflowSummary = {
  workflowId: string;
  name: string;
  createdAt: number;
  lastConnectionAt: number | null;
};

/**
 * `exampleId` is used when deploying an example on liveblocks.io to isolate
 * gallery sessions from each other. You can ignore it when running locally.
 */
export function getAppKey(exampleId: string | null | undefined): string {
  return exampleId ? `${EXAMPLE_ID}-${exampleId}` : EXAMPLE_ID;
}

export function getRoomId(
  workflowId: string,
  exampleId: string | null | undefined
): string {
  const prefix = exampleId ? `${ROOM_ID_PREFIX}-${exampleId}` : ROOM_ID_PREFIX;
  return `${prefix}:${workflowId}`;
}

export function isWorkflowRoomId(roomId: string): boolean {
  return roomId.startsWith(`${ROOM_ID_PREFIX}`);
}

function getMetadataString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export async function listWorkflows(
  exampleId: string | null | undefined
): Promise<WorkflowSummary[]> {
  const { data } = await liveblocks.getRooms({
    query: { metadata: { app: getAppKey(exampleId) } },
    limit: 50,
  });

  return data
    .map((room) => ({
      workflowId: getMetadataString(room.metadata.workflowId),
      name: getMetadataString(room.metadata.name) || "Untitled workflow",
      createdAt: new Date(room.createdAt).getTime(),
      lastConnectionAt: room.lastConnectionAt
        ? new Date(room.lastConnectionAt).getTime()
        : null,
    }))
    .filter((workflow) => workflow.workflowId !== "")
    .sort(
      (a, b) =>
        (b.lastConnectionAt ?? b.createdAt) -
        (a.lastConnectionAt ?? a.createdAt)
    );
}

export async function getWorkflow(
  workflowId: string,
  exampleId: string | null | undefined
): Promise<WorkflowSummary | null> {
  try {
    const room = await liveblocks.getRoom(getRoomId(workflowId, exampleId));

    return {
      workflowId,
      name: getMetadataString(room.metadata.name) || "Untitled workflow",
      createdAt: new Date(room.createdAt).getTime(),
      lastConnectionAt: room.lastConnectionAt
        ? new Date(room.lastConnectionAt).getTime()
        : null,
    };
  } catch {
    return null;
  }
}

export async function createWorkflow(
  exampleId: string | null | undefined,
  options: { name?: string; seedDemo?: boolean } = {}
): Promise<WorkflowSummary> {
  const workflowId = nanoid(10);
  const roomId = getRoomId(workflowId, exampleId);
  const name = options.name ?? DEMO_WORKFLOW_NAME;

  const room = await liveblocks.createRoom(roomId, {
    defaultAccesses: ["room:write"],
    metadata: { app: getAppKey(exampleId), workflowId, name },
  });

  const { nodes, edges } =
    options.seedDemo === false
      ? { nodes: [], edges: [] }
      : createDemoWorkflow();

  await mutateFlow<WorkflowNode, WorkflowEdge>(
    { client: liveblocks, roomId, storageKey: FLOW_STORAGE_KEY },
    (flow) => {
      flow.addNodes(nodes);
      flow.addEdges(edges);
    }
  );

  return {
    workflowId,
    name,
    createdAt: new Date(room.createdAt).getTime(),
    lastConnectionAt: null,
  };
}

export async function renameWorkflow(
  workflowId: string,
  exampleId: string | null | undefined,
  name: string
): Promise<void> {
  await liveblocks.updateRoom(getRoomId(workflowId, exampleId), {
    metadata: { name: name.trim() || "Untitled workflow" },
  });
}

/**
 * Reads a point-in-time snapshot of the workflow graph from Storage.
 */
export async function readWorkflowGraph(roomId: string): Promise<{
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}> {
  let snapshot: { nodes: WorkflowNode[]; edges: WorkflowEdge[] } = {
    nodes: [],
    edges: [],
  };

  await mutateFlow<WorkflowNode, WorkflowEdge>(
    { client: liveblocks, roomId, storageKey: FLOW_STORAGE_KEY },
    (flow) => {
      const json = flow.toJSON();
      snapshot = { nodes: [...json.nodes], edges: [...json.edges] };
    }
  );

  return snapshot;
}
