"use server";

import { openai } from "@ai-sdk/openai";
import { Liveblocks, LiveMap } from "@liveblocks/node";
import { generateText, stepCountIs, tool } from "ai";
import { nanoid } from "nanoid";
import dedent from "dedent";
import { AI_AGENT_USER } from "@/database";
import {
  BLOCK_COLORS,
  BLOCK_SHAPES,
  DEFAULT_BLOCK_SIZE,
  FLOWCHART_EDGE_TYPE,
  FLOWCHART_STORAGE_KEY,
  FlowchartFlow,
  FlowchartNode,
  Point,
  createFlowchartEdge,
  createFlowchartNode,
  getEdgeHandlesForNodes,
  sleep,
  type BlockColor,
  getNodeSize,
  getNodeCenter,
  getMidpoint,
  Bounds,
  getRandomPointInBounds,
  easeInOutCubic,
} from "@/app/flowchart/shared";
import { z } from "zod";
import {
  LiveblocksNode,
  toLiveblocksEdge,
  toLiveblocksNode,
} from "@liveblocks/react-flow";

const PRESENCE_PROGRESS_TTL_SECONDS = 20;
const PRESENCE_DONE_TTL_SECONDS = 2;
const AGENT_PAUSE = 100;
const CURSOR_THINKING_INTERVAL = 1000;
const DEFAULT_BOUNDS_RADIUS = 200;

const POSITION_ANIMATION_MIN_STEPS = 7;
const POSITION_ANIMATION_MAX_STEPS = 14;
const POSITION_ANIMATION_STEP_DISTANCE = 40;

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
});

const idSchema = z.object({ id: z.string() });
const sizeSchema = z.number().min(60).max(300);
const pointSchema = z.object({ x: z.number(), y: z.number() });

const nodeLayoutSchema = z.object({
  position: pointSchema,
  width: sizeSchema.optional(),
  height: sizeSchema.optional(),
});
const nodeDataSchema = z.object({
  label: z.string().optional(),
  shape: z.enum(BLOCK_SHAPES),
  color: z.enum(Object.keys(BLOCK_COLORS) as BlockColor[]),
});
const edgeDataSchema = z.object({
  label: z.string().optional(),
});

function getLiveblocksNodeFrame(node: LiveblocksNode<FlowchartNode>) {
  return {
    position: node.get("position"),
    width: node.get("width") ?? undefined,
    height: node.get("height") ?? undefined,
  };
}

function getLiveblocksNodeSize(node: LiveblocksNode<FlowchartNode>) {
  return getNodeSize(getLiveblocksNodeFrame(node));
}

function getLiveblocksNodeCenter(node: LiveblocksNode<FlowchartNode>): Point {
  return getNodeCenter(getLiveblocksNodeFrame(node));
}

function getBoundsFromLiveblocksNodes(
  nodes: LiveMap<string, LiveblocksNode<FlowchartNode>>
): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasNodes = false;

  for (const node of nodes.values()) {
    const position = node.get("position");
    const { width, height } = getLiveblocksNodeSize(node);

    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + width);
    maxY = Math.max(maxY, position.y + height);

    hasNodes = true;
  }

  return hasNodes ? { minX, minY, maxX, maxY } : null;
}

async function runFlowchartAgent(roomId: string, prompt: string) {
  let lastCursor: Point | null = null;
  let lastThinking: boolean = true;

  async function setPresence({
    cursor,
    thinking,
    ttl,
  }: {
    cursor?: Point;
    thinking?: boolean;
    ttl?: number;
  }) {
    await liveblocks.setPresence(roomId, {
      userId: AI_AGENT_USER.id,
      data: {
        cursor: cursor ?? lastCursor,
        thinking: thinking ?? lastThinking,
      },
      userInfo: AI_AGENT_USER.info,
      ttl: ttl ?? PRESENCE_PROGRESS_TTL_SECONDS,
    });

    lastCursor = cursor ?? lastCursor;
    lastThinking = thinking ?? lastThinking;
  }

  function pause() {
    return sleep(AGENT_PAUSE);
  }

  let queue: Promise<unknown> = Promise.resolve();
  const $ = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(() => fn());

    queue = run.then(
      () => undefined,
      () => undefined
    );

    return run;
  };

  await liveblocks.mutateStorage(roomId, async ({ root }) => {
    const flow = root.get(FLOWCHART_STORAGE_KEY) as FlowchartFlow | undefined;

    if (!flow) {
      return;
    }

    const nodes = flow.get("nodes");
    const edges = flow.get("edges");

    const bounds: Bounds = getBoundsFromLiveblocksNodes(nodes) ?? {
      minX: -DEFAULT_BOUNDS_RADIUS,
      minY: -DEFAULT_BOUNDS_RADIUS,
      maxX: DEFAULT_BOUNDS_RADIUS,
      maxY: DEFAULT_BOUNDS_RADIUS,
    };

    await setPresence({ cursor: getRandomPointInBounds(bounds) });

    let thinkingIntervalId: ReturnType<typeof setInterval> | undefined =
      setInterval(() => {
        void setPresence({ cursor: getRandomPointInBounds(bounds) });
      }, CURSOR_THINKING_INTERVAL);

    function stopThinkingInterval() {
      clearInterval(thinkingIntervalId);
      lastThinking = false;
    }

    try {
      await generateText({
        model: openai("gpt-5.4-nano"),
        system: dedent`
          You edit a live collaborative React Flow flowchart.

          Node shape: { id, position: { x, y }, width, height, data: { label, shape, color } }.
          Edge shape: { id, source, target, sourceHandle, targetHandle, data: { label } }.

          Rules:
          - Keep nodes as "block" and edges as "${FLOWCHART_EDGE_TYPE}".
          - Shapes: ${BLOCK_SHAPES.join(" | ")}.
          - Colors: ${Object.keys(BLOCK_COLORS).join(", ")}.
          - Make small, deliberate changes that are easy to follow visually.
          - Prefer updating the current diagram over rebuilding it.
          - Keep labels short.
          - Maintain readable spacing and avoid overlap.
          - Vary shape, color, and size only when it helps readability.
          - Delete nodes or edges only when the user clearly asks.
          - Edge handles are chosen automatically from geometry.
          - Moving a node automatically refreshes its connected edges.
        `,
        prompt: dedent`
          <diagram>
            ${JSON.stringify(
              {
                nodes: Object.fromEntries(nodes.toImmutable()),
                edges: Object.fromEntries(edges.toImmutable()),
              },
              null,
              2
            )}
          </diagram>

          <user-message>
            ${prompt}
          </user-message>
        `,
        providerOptions: { openai: { reasoningEffort: "low" } },
        tools: {
          addNode: tool({
            description: "Create one block node.",
            inputSchema: z.object({
              ...idSchema.partial().shape,
              ...nodeLayoutSchema.shape,
              ...nodeDataSchema.partial().shape,
            }),
            execute: (newNode) =>
              $(async () => {
                const width = newNode.width ?? DEFAULT_BLOCK_SIZE;
                const height = newNode.height ?? DEFAULT_BLOCK_SIZE;
                const target: Point = {
                  x: newNode.position.x + width / 2,
                  y: newNode.position.y + height / 2,
                };

                await setPresence({ cursor: target });

                await pause();

                const id = newNode.id ?? `block-${nanoid()}`;

                if (nodes.has(id)) {
                  return { ok: false, idExists: true, id };
                }

                const node = createFlowchartNode({ ...newNode, id });
                nodes.set(id, toLiveblocksNode(node));

                await pause();

                return { ok: true, id };
              }),
          }),
          updateNode: tool({
            description:
              "Update one node. Handles should be reconsidered after this to take into account the new layout.",
            inputSchema: z.object({
              ...idSchema.shape,
              ...nodeLayoutSchema.partial().shape,
              ...nodeDataSchema.partial().shape,
            }),
            execute: (updatedNode) =>
              $(async () => {
                const node = nodes.get(updatedNode.id);

                if (!node) {
                  return { ok: false, missing: true, id: updatedNode.id };
                }

                await setPresence({ cursor: getLiveblocksNodeCenter(node) });

                await pause();

                const currentPosition = node.get("position");
                const position = updatedNode.position ?? currentPosition;
                const currentSize = getLiveblocksNodeSize(node);
                const width = updatedNode.width ?? currentSize.width;
                const height = updatedNode.height ?? currentSize.height;

                node.set("width", width);
                node.set("height", height);

                if (updatedNode.position !== undefined) {
                  const distance = Math.hypot(
                    position.x - currentPosition.x,
                    position.y - currentPosition.y
                  );

                  if (distance >= POSITION_ANIMATION_STEP_DISTANCE) {
                    const steps = Math.min(
                      POSITION_ANIMATION_MAX_STEPS,
                      Math.max(
                        POSITION_ANIMATION_MIN_STEPS,
                        Math.ceil(distance / POSITION_ANIMATION_STEP_DISTANCE)
                      )
                    );

                    for (let i = 1; i <= steps; i++) {
                      const progress = easeInOutCubic(i / steps);

                      node.set("position", {
                        x:
                          currentPosition.x +
                          (position.x - currentPosition.x) * progress,
                        y:
                          currentPosition.y +
                          (position.y - currentPosition.y) * progress,
                      });

                      await setPresence({
                        cursor: getLiveblocksNodeCenter(node),
                      });
                    }

                    node.set("position", position);
                  } else {
                    await setPresence({
                      cursor: {
                        x: position.x + width / 2,
                        y: position.y + height / 2,
                      },
                    });

                    await pause();

                    node.set("position", position);
                  }
                }

                const data = node.get("data");

                if (updatedNode.label !== undefined) {
                  data.set("label", updatedNode.label);
                }

                if (updatedNode.shape !== undefined) {
                  data.set("shape", updatedNode.shape);
                }

                if (updatedNode.color !== undefined) {
                  data.set("color", updatedNode.color);
                }

                await pause();

                return { ok: true, id: updatedNode.id };
              }),
          }),
          deleteNode: tool({
            description: "Delete one node.",
            inputSchema: idSchema,
            execute: ({ id }) =>
              $(async () => {
                const node = nodes.get(id);

                if (!node) {
                  return { ok: false, missing: true, id };
                }

                await setPresence({ cursor: getLiveblocksNodeCenter(node) });

                await pause();

                nodes.delete(id);

                await pause();

                return { ok: true, id };
              }),
          }),
          addEdge: tool({
            description:
              "Create one edge between two nodes. Handles should be chosen from the current layout.",
            inputSchema: z.object({
              ...idSchema.partial().shape,
              ...edgeDataSchema.partial().shape,
              source: z.string(),
              target: z.string(),
            }),
            execute: (newEdge) =>
              $(async () => {
                const sourceNode = nodes.get(newEdge.source);
                const targetNode = nodes.get(newEdge.target);

                if (!sourceNode || !targetNode) {
                  return {
                    ok: false,
                    missing: true,
                    source: newEdge.source,
                    target: newEdge.target,
                  };
                }

                const sourceCenter = getLiveblocksNodeCenter(sourceNode);
                const targetCenter = getLiveblocksNodeCenter(targetNode);

                await setPresence({ cursor: sourceCenter });

                await pause();

                await setPresence({ cursor: targetCenter });

                await pause();

                const id =
                  newEdge.id ??
                  `e-${newEdge.source}-${newEdge.target}-${nanoid(6)}`;

                if (edges.has(id)) {
                  return { ok: false, idExists: true, id };
                }

                const { sourceHandle, targetHandle } = getEdgeHandlesForNodes(
                  getLiveblocksNodeFrame(sourceNode),
                  getLiveblocksNodeFrame(targetNode)
                );

                const edge = createFlowchartEdge({
                  id,
                  source: newEdge.source,
                  target: newEdge.target,
                  sourceHandle,
                  targetHandle,
                  label: "",
                });
                edges.set(id, toLiveblocksEdge(edge));

                await pause();

                const label = newEdge.label?.trim();

                if (label) {
                  await setPresence({
                    cursor: getMidpoint(sourceCenter, targetCenter),
                  });

                  await pause();

                  const edge = edges.get(id);

                  edge?.get("data")?.set("label", label);

                  await pause();
                }

                return { ok: true, id };
              }),
          }),
          updateEdge: tool({
            description: "Update one edge.",
            inputSchema: z.object({
              ...idSchema.shape,
              ...edgeDataSchema.partial().shape,
            }),
            execute: (updatedEdge) =>
              $(async () => {
                const edge = edges.get(updatedEdge.id);

                if (!edge) {
                  return {
                    ok: false,
                    missing: true,
                    id: updatedEdge.id,
                  };
                }

                const sourceId = edge.get("source") as string;
                const targetId = edge.get("target") as string;
                const sourceNode = nodes.get(sourceId);
                const targetNode = nodes.get(targetId);

                if (!sourceNode || !targetNode) {
                  return {
                    ok: false,
                    missing: true,
                    id: updatedEdge.id,
                  };
                }

                const sourceCenter = getLiveblocksNodeCenter(sourceNode);
                const targetCenter = getLiveblocksNodeCenter(targetNode);

                await setPresence({ cursor: sourceCenter });

                await pause();

                await setPresence({ cursor: targetCenter });

                await pause();

                if (updatedEdge.label !== undefined) {
                  edge.get("data")?.set("label", updatedEdge.label);

                  await pause();
                }

                return { ok: true, id: updatedEdge.id };
              }),
          }),
          deleteEdge: tool({
            description: "Delete one edge.",
            inputSchema: idSchema,
            execute: ({ id }) =>
              $(async () => {
                const edge = edges.get(id);

                if (!edge) {
                  return { ok: false, missing: true, id };
                }

                const sourceNode = nodes.get(edge.get("source"));
                const targetNode = nodes.get(edge.get("target"));

                if (!sourceNode || !targetNode) {
                  return { ok: false, missing: true, id };
                }

                await setPresence({
                  cursor: getMidpoint(
                    getLiveblocksNodeCenter(sourceNode),
                    getLiveblocksNodeCenter(targetNode)
                  ),
                });

                await pause();

                await setPresence({
                  cursor: getLiveblocksNodeCenter(sourceNode),
                });

                await pause();

                edges.delete(id);

                await pause();

                return { ok: true, id };
              }),
          }),
        },
        stopWhen: stepCountIs(30),
        experimental_onToolCallStart: stopThinkingInterval,
      });
    } finally {
      stopThinkingInterval();
    }
  });

  await setPresence({ ttl: PRESENCE_DONE_TTL_SECONDS });
}

type FlowchartAgentActionState = { ok: true } | null;

export async function submitFlowchartAgentAction(
  _: FlowchartAgentActionState,
  formData: FormData
): Promise<FlowchartAgentActionState> {
  if (!process.env.LIVEBLOCKS_SECRET_KEY || !process.env.OPENAI_API_KEY) {
    return null;
  }

  const roomId = String(formData.get("roomId") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (roomId === "" || prompt === "") {
    return null;
  }

  try {
    await runFlowchartAgent(roomId, prompt);

    return { ok: true };
  } catch (error) {
    console.error(error);

    return null;
  }
}
