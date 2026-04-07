"use server";

import { openai } from "@ai-sdk/openai";
import { Liveblocks } from "@liveblocks/node";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { generateText, stepCountIs, tool } from "ai";
import dedent from "dedent";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createAgentUser } from "../api/database";
import {
  BLOCK_COLORS,
  BLOCK_SHAPES,
  DEFAULT_BLOCK_SIZE,
  FLOWCHART_EDGE_TYPE,
  FLOWCHART_STORAGE_KEY,
  FlowchartEdge,
  FlowchartNode,
  createFlowchartEdge,
  createFlowchartNode,
  easeInOutCubic,
  getBoundsFromNodes,
  getEdgeHandlesForNodes,
  getMidpoint,
  getNodeCenter,
  getNodeSize,
  getRandomPointInBounds,
  sleep,
  type BlockColor,
  type Bounds,
  type Point,
} from "./shared";

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

async function runFlowchartAgent(roomId: string, prompt: string) {
  const agentUser = createAgentUser();
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
      userId: agentUser.id,
      data: {
        cursor: cursor ?? lastCursor,
        thinking: thinking ?? lastThinking,
      },
      userInfo: agentUser.info,
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

  await mutateFlow<FlowchartNode, FlowchartEdge>(
    {
      client: liveblocks,
      roomId,
      storageKey: FLOWCHART_STORAGE_KEY,
    },
    async (flow) => {
      const bounds: Bounds = getBoundsFromNodes(flow.nodes) ?? {
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
          - Edge handles should be chosen based on the layout of the source and target nodes.
          - When moving a node, attached edges should be updated to reflect the new layout. For example, a "bottom" to "top" edge makes sense for two nodes that are above each other, but if they become side by side, the edge should be updated to a "right" to "left" edge.
          - Use moveNode to change position, resizeNode to change width/height, and styleNode for label/shape/color — never mix them.
        `,
          prompt: dedent`
          <diagram>
            ${JSON.stringify(flow, null, 2)}
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

                  await setPresence({
                    cursor: {
                      x: newNode.position.x + width / 2,
                      y: newNode.position.y + height / 2,
                    },
                  });

                  await pause();

                  const id = newNode.id ?? `block-${nanoid()}`;

                  if (flow.getNode(id)) {
                    return { ok: false, idExists: true, id };
                  }

                  const node = createFlowchartNode({ ...newNode, id });
                  flow.addNode(node);

                  await pause();

                  return { ok: true, id };
                }),
            }),
            moveNode: tool({
              description: "Move one node to a new position.",
              inputSchema: z.object({
                id: z.string(),
                position: pointSchema,
              }),
              execute: (updatedNode) =>
                $(async () => {
                  const node = flow.getNode(updatedNode.id);

                  if (!node) {
                    return { ok: false, missing: true, id: updatedNode.id };
                  }

                  await setPresence({ cursor: getNodeCenter(node) });

                  await pause();

                  const currentPosition = node.position;
                  const position = updatedNode.position;
                  const { width, height } = getNodeSize(node);

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
                      const nextPosition = {
                        x:
                          currentPosition.x +
                          (position.x - currentPosition.x) * progress,
                        y:
                          currentPosition.y +
                          (position.y - currentPosition.y) * progress,
                      };

                      flow.updateNode(updatedNode.id, {
                        position: nextPosition,
                      });

                      await setPresence({
                        cursor: {
                          x: nextPosition.x + width / 2,
                          y: nextPosition.y + height / 2,
                        },
                      });
                    }

                    flow.updateNode(updatedNode.id, { position });
                  } else {
                    await setPresence({
                      cursor: {
                        x: position.x + width / 2,
                        y: position.y + height / 2,
                      },
                    });

                    await pause();

                    flow.updateNode(updatedNode.id, { position });
                  }

                  await pause();

                  return { ok: true, id: updatedNode.id };
                }),
            }),
            resizeNode: tool({
              description: "Resize one node.",
              inputSchema: z.object({
                id: z.string(),
                width: sizeSchema.optional(),
                height: sizeSchema.optional(),
              }),
              execute: (updatedNode) =>
                $(async () => {
                  const node = flow.getNode(updatedNode.id);

                  if (!node) {
                    return { ok: false, missing: true, id: updatedNode.id };
                  }

                  const { position } = node;
                  const { width: currentWidth, height: currentHeight } =
                    getNodeSize(node);

                  await setPresence({
                    cursor: {
                      x: position.x + currentWidth,
                      y: position.y + currentHeight,
                    },
                  });

                  await pause();

                  const partial: Partial<FlowchartNode> = {};
                  if (updatedNode.width !== undefined) {
                    partial.width = updatedNode.width;
                  }
                  if (updatedNode.height !== undefined) {
                    partial.height = updatedNode.height;
                  }

                  if (Object.keys(partial).length > 0) {
                    flow.updateNode(updatedNode.id, partial);
                  }

                  const newWidth = updatedNode.width ?? currentWidth;
                  const newHeight = updatedNode.height ?? currentHeight;

                  await setPresence({
                    cursor: {
                      x: position.x + newWidth,
                      y: position.y + newHeight,
                    },
                  });

                  await pause();

                  return { ok: true, id: updatedNode.id };
                }),
            }),
            updateNodeData: tool({
              description: "Update one node's data.",
              inputSchema: z.object({
                ...idSchema.shape,
                ...nodeDataSchema.partial().shape,
              }),
              execute: (updatedNode) =>
                $(async () => {
                  const node = flow.getNode(updatedNode.id);

                  if (!node) {
                    return { ok: false, missing: true, id: updatedNode.id };
                  }

                  await setPresence({ cursor: getNodeCenter(node) });

                  await pause();

                  const dataPartial: Partial<FlowchartNode["data"]> = {};

                  if (updatedNode.label !== undefined) {
                    dataPartial.label = updatedNode.label;
                  }

                  if (updatedNode.shape !== undefined) {
                    dataPartial.shape = updatedNode.shape;
                  }

                  if (updatedNode.color !== undefined) {
                    dataPartial.color = updatedNode.color;
                  }

                  if (Object.keys(dataPartial).length > 0) {
                    flow.updateNodeData(updatedNode.id, dataPartial);
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
                  const node = flow.getNode(id);

                  if (!node) {
                    return { ok: false, missing: true, id };
                  }

                  await setPresence({ cursor: getNodeCenter(node) });

                  await pause();

                  flow.removeNode(id);

                  await pause();

                  return { ok: true, id };
                }),
            }),
            addEdge: tool({
              description: "Create one edge between two nodes.",
              inputSchema: z.object({
                ...idSchema.partial().shape,
                ...edgeDataSchema.partial().shape,
                source: z.string(),
                target: z.string(),
              }),
              execute: (newEdge) =>
                $(async () => {
                  const sourceNode = flow.getNode(newEdge.source);
                  const targetNode = flow.getNode(newEdge.target);

                  if (!sourceNode || !targetNode) {
                    return {
                      ok: false,
                      missing: true,
                      source: newEdge.source,
                      target: newEdge.target,
                    };
                  }

                  const sourceCenter = getNodeCenter(sourceNode);
                  const targetCenter = getNodeCenter(targetNode);

                  await setPresence({ cursor: sourceCenter });

                  await pause();

                  await setPresence({ cursor: targetCenter });

                  await pause();

                  const id =
                    newEdge.id ??
                    `e-${newEdge.source}-${newEdge.target}-${nanoid(6)}`;

                  if (flow.getEdge(id)) {
                    return { ok: false, idExists: true, id };
                  }

                  const { sourceHandle, targetHandle } = getEdgeHandlesForNodes(
                    sourceNode,
                    targetNode
                  );

                  const edge = createFlowchartEdge({
                    id,
                    source: newEdge.source,
                    target: newEdge.target,
                    sourceHandle,
                    targetHandle,
                    label: "",
                  });
                  flow.addEdge(edge);

                  await pause();

                  const label = newEdge.label?.trim();

                  if (label) {
                    await setPresence({
                      cursor: getMidpoint(sourceCenter, targetCenter),
                    });

                    await pause();

                    flow.updateEdgeData(id, { label });

                    await pause();
                  }

                  return { ok: true, id };
                }),
            }),
            updateEdgeData: tool({
              description: "Update one edge's data.",
              inputSchema: z.object({
                ...idSchema.shape,
                ...edgeDataSchema.partial().shape,
              }),
              execute: (updatedEdge) =>
                $(async () => {
                  const edge = flow.getEdge(updatedEdge.id);

                  if (!edge) {
                    return {
                      ok: false,
                      missing: true,
                      id: updatedEdge.id,
                    };
                  }

                  const sourceNode = flow.getNode(edge.source);
                  const targetNode = flow.getNode(edge.target);

                  if (!sourceNode || !targetNode) {
                    return {
                      ok: false,
                      missing: true,
                      id: updatedEdge.id,
                    };
                  }

                  const sourceCenter = getNodeCenter(sourceNode);
                  const targetCenter = getNodeCenter(targetNode);

                  await setPresence({ cursor: sourceCenter });

                  await pause();

                  await setPresence({ cursor: targetCenter });

                  await pause();

                  if (updatedEdge.label !== undefined) {
                    flow.updateEdgeData(updatedEdge.id, {
                      label: updatedEdge.label,
                    });

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
                  const edge = flow.getEdge(id);

                  if (!edge) {
                    return { ok: false, missing: true, id };
                  }

                  const sourceNode = flow.getNode(edge.source);
                  const targetNode = flow.getNode(edge.target);

                  if (!sourceNode || !targetNode) {
                    return { ok: false, missing: true, id };
                  }

                  await setPresence({
                    cursor: getMidpoint(
                      getNodeCenter(sourceNode),
                      getNodeCenter(targetNode)
                    ),
                  });

                  await pause();

                  await setPresence({
                    cursor: getNodeCenter(sourceNode),
                  });

                  await pause();

                  flow.removeEdge(id);

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
    }
  );

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
