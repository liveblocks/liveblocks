export interface Diff {
  title: string;
  from: string;
  to: string;
  changes: DiffFile[];
}

export interface DiffFile {
  path: string;
  status: "added" | "modified" | "renamed" | "deleted";
  oldPath?: string;
  patch: string;
}

export const DIFF: Diff = {
  title: "Add new API for server-side React Flow mutations",
  from: "mutate-flow",
  to: "main",
  changes: [
    {
      path: "CHANGELOG.md",
      status: "modified",
      patch: `@@ -18,7 +18,12 @@
    For full upgrade instructions, see the
   JSON snapshot, only mutating what changed.
 - \`initialStorage\` accepts \`LiveObject.from()\` result directly.
 
+### \`@liveblocks/react-flow\`
+
+- New \`mutateFlow()\` API for reading and mutating React Flow data from a Node.js
+  backend. Import from \`@liveblocks/react-flow/node\`.
+
 ### \`@liveblocks/zustand\` and \`@liveblocks/redux\`
 
 - Fix: Initial storage seeding no longer creates an undo frame.`,
    },
    {
      path: "examples/nextjs-react-flow-ai/app/flowchart/agent.ts",
      status: "modified",
      patch: `@@ -1,28 +1,25 @@
 "use server";
 
 import { openai } from "@ai-sdk/openai";
-import { Liveblocks, LiveMap } from "@liveblocks/node";
+import { Liveblocks } from "@liveblocks/node";
+import { mutateFlow } from "@liveblocks/react-flow/node";
 import { generateText, stepCountIs, tool } from "ai";
 import dedent from "dedent";
 import { nanoid } from "nanoid";
 import { z } from "zod";
-import {
-  LiveblocksNode,
-  toLiveblocksEdge,
-  toLiveblocksNode,
-} from "@liveblocks/react-flow";
 import { createAgentUser } from "../api/database";
 import {
   BLOCK_COLORS,
   BLOCK_SHAPES,
   DEFAULT_BLOCK_SIZE,
   FLOWCHART_EDGE_TYPE,
   FLOWCHART_STORAGE_KEY,
-  FlowchartFlow,
+  FlowchartEdge,
   FlowchartNode,
   createFlowchartEdge,
   createFlowchartNode,
   easeInOutCubic,
+  getBoundsFromNodes,
   getEdgeHandlesForNodes,
   getMidpoint,
   getNodeCenter,
@@ -31,7 +28,6 @@ import {
   sleep,
   type BlockColor,
   type Bounds,
-  type Frame,
   type Point,
 } from "./shared";
 
@@ -68,46 +64,6 @@ const edgeDataSchema = z.object({
   label: z.string().optional(),
 });
 
-function getLiveblocksNodeFrame(node: LiveblocksNode<FlowchartNode>): Frame {
-  return {
-    position: node.get("position") as Point,
-    width: node.get("width") ?? undefined,
-    height: node.get("height") ?? undefined,
-  };
-}
-
-function getLiveblocksNodeSize(node: LiveblocksNode<FlowchartNode>) {
-  return getNodeSize(getLiveblocksNodeFrame(node));
-}
-
-function getLiveblocksNodeCenter(node: LiveblocksNode<FlowchartNode>): Point {
-  return getNodeCenter(getLiveblocksNodeFrame(node));
-}
-
-function getBoundsFromLiveblocksNodes(
-  nodes: LiveMap<string, LiveblocksNode<FlowchartNode>>
-): Bounds | null {
-  let minX = Infinity;
-  let minY = Infinity;
-  let maxX = -Infinity;
-  let maxY = -Infinity;
-  let hasNodes = false;
-
-  for (const node of nodes.values()) {
-    const position = node.get("position") as Point;
-    const { width, height } = getLiveblocksNodeSize(node);
-
-    minX = Math.min(minX, position.x);
-    minY = Math.min(minY, position.y);
-    maxX = Math.max(maxX, position.x + width);
-    maxY = Math.max(maxY, position.y + height);
-
-    hasNodes = true;
-  }
-
-  return hasNodes ? { minX, minY, maxX, maxY } : null;
-}
-
 async function runFlowchartAgent(roomId: string, prompt: string) {
   const agentUser = createAgentUser();
   let lastCursor: Point | null = null;
@@ -152,39 +108,36 @@ async function runFlowchartAgent(roomId: string, prompt: string) {
     return run;
   };
 
-  await liveblocks.mutateStorage(roomId, async ({ root }) => {
-    const flow = root.get(FLOWCHART_STORAGE_KEY) as FlowchartFlow | undefined;
-
-    if (!flow) {
-      return;
-    }
-
-    const nodes = flow.get("nodes");
-    const edges = flow.get("edges");
-
-    const bounds: Bounds = getBoundsFromLiveblocksNodes(nodes) ?? {
-      minX: -DEFAULT_BOUNDS_RADIUS,
-      minY: -DEFAULT_BOUNDS_RADIUS,
-      maxX: DEFAULT_BOUNDS_RADIUS,
-      maxY: DEFAULT_BOUNDS_RADIUS,
-    };
-
-    await setPresence({ cursor: getRandomPointInBounds(bounds) });
-
-    let thinkingIntervalId: ReturnType<typeof setInterval> | undefined =
-      setInterval(() => {
-        void setPresence({ cursor: getRandomPointInBounds(bounds) });
-      }, CURSOR_THINKING_INTERVAL);
-
-    function stopThinkingInterval() {
-      clearInterval(thinkingIntervalId);
-      lastThinking = false;
-    }
-
-    try {
-      await generateText({
-        model: openai("gpt-5.4-nano"),
-        system: dedent\`
+  await mutateFlow<FlowchartNode, FlowchartEdge>(
+    {
+      client: liveblocks,
+      roomId,
+      storageKey: FLOWCHART_STORAGE_KEY,
+    },
+    async (flow) => {
+      const bounds: Bounds = getBoundsFromNodes(flow.nodes) ?? {
+        minX: -DEFAULT_BOUNDS_RADIUS,
+        minY: -DEFAULT_BOUNDS_RADIUS,
+        maxX: DEFAULT_BOUNDS_RADIUS,
+        maxY: DEFAULT_BOUNDS_RADIUS,
+      };
+
+      await setPresence({ cursor: getRandomPointInBounds(bounds) });
+
+      let thinkingIntervalId: ReturnType<typeof setInterval> | undefined =
+        setInterval(() => {
+          void setPresence({ cursor: getRandomPointInBounds(bounds) });
+        }, CURSOR_THINKING_INTERVAL);
+
+      function stopThinkingInterval() {
+        clearInterval(thinkingIntervalId);
+        lastThinking = false;
+      }
+
+      try {
+        await generateText({
+          model: openai("gpt-5.4-nano"),
+          system: dedent\`
           You edit a live collaborative React Flow flowchart.
 
           Node shape: { id, position: { x, y }, width, height, data: { label, shape, color } }.`,
    },
    {
      path: "examples/nextjs-react-flow-ai/app/flowchart/shared.ts",
      status: "modified",
      patch: `@@ -27,7 +27,6 @@ export const FLOWCHART_EDGE_TYPE = "smoothstep" as const;
 export const BLOCK_HANDLE_SIDES = ["top", "right", "bottom", "left"] as const;
 
 export type Point = { x: number; y: number };
-export type Frame = { position: Point; width?: number; height?: number };
 export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
 
 export type BlockShape = (typeof BLOCK_SHAPES)[number];
@@ -62,14 +61,14 @@ export function blockTargetHandleId(
   return \`tgt-\${side}\`;
 }
 
-export function getNodeSize(node: Pick<Frame, "width" | "height">) {
+export function getNodeSize(node: FlowchartNode) {
   return {
     width: node.width ?? DEFAULT_BLOCK_SIZE,
     height: node.height ?? DEFAULT_BLOCK_SIZE,
   };
 }
 
-export function getNodeCenter(node: Frame): Point {
+export function getNodeCenter(node: FlowchartNode): Point {
   const { width, height } = getNodeSize(node);
 
   return {
@@ -78,8 +77,32 @@ export function getNodeCenter(node: Frame): Point {
   };
 }
 
+export function getBoundsFromNodes(
+  nodes: readonly FlowchartNode[]
+): Bounds | null {
+  let minX = Infinity;
+  let minY = Infinity;
+  let maxX = -Infinity;
+  let maxY = -Infinity;
+  let hasNodes = false;
+
+  for (const node of nodes) {
+    const { position } = node;
+    const { width, height } = getNodeSize(node);
+
+    minX = Math.min(minX, position.x);
+    minY = Math.min(minY, position.y);
+    maxX = Math.max(maxX, position.x + width);
+    maxY = Math.max(maxY, position.y + height);
+
+    hasNodes = true;
+  }
+
+  return hasNodes ? { minX, minY, maxX, maxY } : null;
+}
+
 export function flowPointToNormalized(
-  node: Frame,
+  node: FlowchartNode,
   flowX: number,
   flowY: number
 ): Point {
@@ -91,7 +114,10 @@ export function flowPointToNormalized(
   };
 }
 
-export function normalizedToFlowPoint(node: Frame, normalized: Point): Point {
+export function normalizedToFlowPoint(
+  node: FlowchartNode,
+  normalized: Point
+): Point {
   const { width, height } = getNodeSize(node);
 
   return {
@@ -101,7 +127,7 @@ export function normalizedToFlowPoint(node: Frame, normalized: Point): Point {
 }
 
 export function getNodeAtFlowPoint(
-  nodes: FlowchartNode[],
+  nodes: readonly FlowchartNode[],
   flow: Point
 ): FlowchartNode | undefined {
   return nodes.find((node) => {
@@ -130,8 +156,8 @@ export function easeInOutCubic(t: number) {
 }
 
 export function getEdgeHandlesForNodes(
-  sourceNode: Frame,
-  targetNode: Frame
+  sourceNode: FlowchartNode,
+  targetNode: FlowchartNode
 ): {
   sourceHandle: BlockSourceHandleId;
   targetHandle: BlockTargetHandleId;`,
    },
    {
      path: "examples/nextjs-react-flow-ai/package.json",
      status: "modified",
      patch: `@@ -11,11 +11,11 @@
   },
   "dependencies": {
     "@ai-sdk/openai": "^3.0.48",
-    "@liveblocks/client": "^3.17.0",
-    "@liveblocks/node": "^3.17.0",
-    "@liveblocks/react": "^3.17.0",
-    "@liveblocks/react-flow": "^3.17.0",
-    "@liveblocks/react-ui": "^3.17.0",
+    "@liveblocks/client": "3.18.0",
+    "@liveblocks/node": "3.18.0",
+    "@liveblocks/react": "3.18.0",
+    "@liveblocks/react-flow": "3.18.0",
+    "@liveblocks/react-ui": "3.18.0",
     "@xyflow/react": "^12.10.1",
     "ai": "^6.0.136",
     "dedent": "^1.7.2",`,
    },
    {
      path: "packages/liveblocks-react-flow/package.json",
      status: "modified",
      patch: `@@ -7,6 +7,6 @@
   "type": "module",
   "main": "./dist/index.cjs",
   "types": "./dist/index.d.cts",
   "exports": {
     ".": {
       "import": {
@@ -19,6 +24,17 @@
         "default": "./dist/index.cjs"
       }
     },
+    "./node": {
+      "import": {
+        "types": "./dist/node.d.ts",
+        "default": "./dist/node.js"
+      },
+      "require": {
+        "types": "./dist/node.d.cts",
+        "module": "./dist/node.js",
+        "default": "./dist/node.cjs"
+      }
+    },
     "./styles.css": {
       "types": "./styles.css.d.cts",
       "default": "./styles.css"
@@ -37,6 +53,6 @@
     "build": "rollup --config rollup.config.js",
     "start": "npm run dev",
     "format": "(eslint --fix src/ || true) && stylelint --fix src/styles/ && prettier --write src/",
     "lint": "eslint src/ && stylelint src/styles/",
     "test": "npx liveblocks dev -p 1154 -c 'vitest run --coverage'",
     "test:ci": "vitest run",
@@ -64,6 +81,7 @@
   },
   "devDependencies": {
     "@liveblocks/eslint-config": "*",
+    "@liveblocks/node": "*",
     "@liveblocks/rollup-config": "*",
     "@liveblocks/vitest-config": "*",
     "@testing-library/jest-dom": "^6.4.6",`,
    },
    {
      path: "packages/liveblocks-react-flow/rollup.config.js",
      status: "modified",
      patch: `@@ -7,7 +7,7 @@ import pkg from "./package.json" with { type: "json" };
 
 export default createConfig({
   pkg,
-  entries: ["src/index.ts"],
+  entries: ["src/index.ts", "src/node.ts"],
   styles: [
     {
       entry: "src/styles/index.css",`,
    },
    {
      path: "packages/liveblocks-react-flow/src/__tests__/mutate-flow-from-backend.test.ts",
      status: "added",
      patch: `@@ -0,0 +1,297 @@
+import type { JsonObject } from "@liveblocks/core";
+import { createClient, nanoid } from "@liveblocks/core";
+import { Liveblocks } from "@liveblocks/node";
+import type { Node } from "@xyflow/react";
+import { describe, expect, onTestFinished, test, vi } from "vitest";
+
+import { mutateFlow } from "../node";
+
+const DEV_SERVER = "http://localhost:1154";
+
+const client = new Liveblocks({
+  secret: "sk_localdev",
+  baseUrl: DEV_SERVER,
+});
+
+/**
+ * Creates a room on the dev server and optionally initializes its storage.
+ */
+async function initRoom(storage?: Record<string, unknown>): Promise<string> {
+  const roomId = \`room-\${nanoid()}\`;
+
+  await fetch(\`\${DEV_SERVER}/v2/rooms\`, {
+    method: "POST",
+    headers: {
+      Authorization: "Bearer sk_localdev",
+      "Content-Type": "application/json",
+    },
+    body: JSON.stringify({ id: roomId }),
+  });
+
+  if (storage) {
+    await fetch(
+      \`\${DEV_SERVER}/v2/rooms/\${encodeURIComponent(roomId)}/storage\`,
+      {
+        method: "POST",
+        headers: {
+          Authorization: "Bearer sk_localdev",
+          "Content-Type": "application/json",
+        },
+        body: JSON.stringify({
+          liveblocksType: "LiveObject",
+          data: storage,
+        }),
+      }
+    );
+  }
+
+  return roomId;
+}
+
+async function getStorage(roomId: string): Promise<Record<string, unknown>> {
+  const resp = await fetch(
+    \`\${DEV_SERVER}/v2/rooms/\${encodeURIComponent(roomId)}/storage?format=json\`,
+    { headers: { Authorization: "Bearer sk_localdev" } }
+  );
+  return (await resp.json()) as Record<string, unknown>;
+}
+
+/**
+ * Connects a live observer client to a room via WebSocket and returns a
+ * function that collects storage update batches. Useful for verifying that
+ * mutations emit the expected number of ops.
+ */
+async function connectObserver(roomId: string) {
+  const res = await fetch(\`\${DEV_SERVER}/v2/authorize-user\`, {
+    method: "POST",
+    headers: {
+      Authorization: "Bearer sk_localdev",
+      "Content-Type": "application/json",
+    },
+    body: JSON.stringify({
+      userId: \`observer-\${nanoid()}\`,
+      userInfo: {},
+      permissions: { [roomId]: ["room:write"] },
+    }),
+  });
+  const { token } = (await res.json()) as { token: string };
+
+  const liveClient = createClient({
+    baseUrl: DEV_SERVER,
+    authEndpoint: () => Promise.resolve({ token }),
+    polyfills: { WebSocket: globalThis.WebSocket },
+  });
+
+  const { room, leave } = liveClient.enterRoom<JsonObject, JsonObject>(roomId, {
+    initialPresence: {},
+    initialStorage: {},
+  });
+
+  onTestFinished(leave);
+
+  // Wait for connection + initial storage sync
+  await vi.waitUntil(() => room.getStatus() === "connected");
+  await room.getStorage();
+
+  const batches: number[] = [];
+  room.events.storageBatch.subscribe((updates) => {
+    batches.push(updates.length);
+  });
+
+  return {
+    room,
+    /** Returns array where each element = number of updates in one batch */
+    getBatches: () => batches,
+  };
+}
+
+// ---------------------------------------------------------------------------
+// Tests
+// ---------------------------------------------------------------------------
+
+describe("mutateFlow", () => {
+  // -- Empty room / initialization --
+
+  test("auto-initializes empty flow storage when room is empty", async () => {
+    const roomId = await initRoom();
+
+    await mutateFlow({ client, roomId }, (flow) => {
+      expect(flow.nodes).toEqual([]);
+      expect(flow.edges).toEqual([]);
+    });
+  });
+
+  test("reads existing nodes and edges from storage", async () => {
+    const roomId = await initRoom({
+      flow: {
+        liveblocksType: "LiveObject",
+        data: {
+          nodes: {
+            liveblocksType: "LiveMap",
+            data: {
+              n1: {
+                liveblocksType: "LiveObject",
+                data: {
+                  id: "n1",
+                  position: {
+                    liveblocksType: "LiveObject",
+                    data: { x: 0, y: 0 },
+                  },
+                  data: {
+                    liveblocksType: "LiveObject",
+                    data: { label: "Hello" },
+                  },
+                },
+              },
+            },
+          },
+          edges: {
+            liveblocksType: "LiveMap",
+            data: {
+              e1: {
+                liveblocksType: "LiveObject",
+                data: { id: "e1", source: "n1", target: "n2" },
+              },
+            },
+          },
+        },
+      },
+    });
+
+    await mutateFlow({ client, roomId }, (flow) => {
+      const nodes = flow.nodes;
+      expect(nodes).toHaveLength(1);
+      expect(nodes[0]).toMatchObject({ id: "n1", data: { label: "Hello" } });
+
+      const edges = flow.edges;
+      expect(edges).toHaveLength(1);
+      expect(edges[0]).toMatchObject({ id: "e1", source: "n1", target: "n2" });
+    });
+  });
+
+  // -- toJSON --
+
+  test("toJSON returns both nodes and edges", async () => {
+    const roomId = await initRoom();
+
+    await mutateFlow({ client, roomId }, (flow) => {
+      flow.addNode({
+        id: "n1",
+        type: "default",
+        position: { x: 0, y: 0 },
+        data: { label: "A" },
+      });
+      flow.addEdge({ id: "e1", source: "n1", target: "n2" });
+
+      const { nodes, edges } = flow;
+      expect(nodes).toHaveLength(1);
+      expect(nodes[0]).toMatchObject({ id: "n1" });
+      expect(edges).toHaveLength(1);
+      expect(edges[0]).toMatchObject({ id: "e1" });
+
+      // JSON.stringify calls toJSON() automatically
+      expect(JSON.parse(JSON.stringify(flow))).toEqual({
+        nodes: [
+          {
+            id: "n1",
+            type: "default",
+            position: { x: 0, y: 0 },
+            data: { label: "A" },
+          },
+        ],
+        edges: [{ id: "e1", source: "n1", target: "n2" }],
+      });
+    });
+  });
+
+  // -- getNode / getEdge --
+
+  test("getNode returns a single node by id", async () => {
+    const roomId = await initRoom();
+
+    await mutateFlow({ client, roomId }, (flow) => {
+      flow.addNode({
+        type: "default",
+        id: "n1",
+        position: { x: 0, y: 0 },
+        data: { label: "A" },
+      });
+      expect(flow.getNode("n1")).toMatchObject({ id: "n1" });
+      expect(flow.getNode("nope")).toBeUndefined();
+    });
+  });
+
+  test("getEdge returns a single edge by id", async () => {
+    const roomId = await initRoom();
+
+    await mutateFlow({ client, roomId }, (flow) => {
+      flow.addEdge({ id: "e1", source: "n1", target: "n2" });
+      expect(flow.getEdge("e1")).toMatchObject({ id: "e1" });
+      expect(flow.getEdge("nope")).toBeUndefined();
+    });
+  });
+
+  // -- addNode / addNodes --
+
+  test("addNode adds a node to an empty flow", async () => {
+    const roomId = await initRoom();
+
+    await mutateFlow({ client, roomId }, (flow) => {
+      flow.addNode({
+        id: "n1",
+        type: "input",
+        position: { x: 10, y: 20 },
+        data: { label: "New" },
+      });
+
+      const nodes = flow.nodes;
+      expect(nodes).toHaveLength(1);
+      expect(nodes[0]).toMatchObject({
+        id: "n1",
+        type: "input",
+        position: { x: 10, y: 20 },
+        data: { label: "New" },
+      });
+    });
+
+    // Verify storage was persisted
+    const storage = await getStorage(roomId);
+    expect(storage).toMatchObject({
+      flow: { nodes: { n1: { id: "n1", type: "input" } } },
+    });
+  });
+
+  test("addNodes adds multiple nodes at once", async () => {
+    const roomId = await initRoom();
+
+    await mutateFlow({ client, roomId }, (flow) => {
+      flow.addNodes([
+        {
+          id: "a",
+          type: "default",
+          position: { x: 0, y: 0 },
+          data: { label: "one" },
+        },
+        {
+          id: "b",
+          type: "default",
+          position: { x: 1, y: 1 },
+          data: { label: "two" },
+        },
+      ]);
+
+      expect(flow.nodes).toHaveLength(2);
+    });
+  });
+
+  // -- updateNode --
+
+  test("updateNode with partial object", async () => {
+    const roomId = await initRoom();
+
+    await mutateFlow({ client, roomId }, (flow) => {
+      flow.addNode({
+        type: "default",
+        id: "n1",
+        position: { x: 0, y: 0 },
+        data: { label: "Old" },`,
    },
    {
      path: "packages/liveblocks-react-flow/src/constants.ts",
      status: "deleted",
      patch: `@@ -1,41 +0,0 @@
-import type { SyncMode } from "@liveblocks/core";
-import type { Edge, Node } from "@xyflow/react";
-
-export const DEFAULT_STORAGE_KEY = "flow";
-
-// React Flow specific versions of \`SyncConfig\` that only allow keys that are actually exposed by React Flow.
-type NodeSyncConfig = { [K in keyof Node]?: SyncMode };
-type EdgeSyncConfig = { [K in keyof Edge]?: SyncMode };
-
-export const NODE_BASE_CONFIG = {
-  // Local-only (not synced)
-  selected: false,
-  dragging: false,
-  measured: false,
-  resizing: false,
-
-  // Atomic (synced as plain Json)
-  position: "atomic",
-  sourcePosition: "atomic",
-  targetPosition: "atomic",
-  extent: "atomic",
-  origin: "atomic",
-  handles: "atomic",
-
-  // Note: the \`data\` key is intentionally left out of this base config, as it
-  // is expected to be provided by the end user
-} as const satisfies NodeSyncConfig;
-
-export const EDGE_BASE_CONFIG = {
-  // Local-only (not synced)
-  selected: false,
-
-  // Atomic (synced as plain Json)
-  markerStart: "atomic",
-  markerEnd: "atomic",
-  label: "atomic",
-  labelBgPadding: "atomic",
-
-  // Note: the \`data\` key is intentionally left out of this base config, as it
-  // is expected to be provided by the end user
-} as const satisfies EdgeSyncConfig;`,
    },
    {
      path: "packages/liveblocks-react-flow/src/flow.ts",
      status: "modified",
      patch: `@@ -28,11 +28,12 @@ import { addEdge as defaultAddEdge } from "@xyflow/react";
 import { useEffect, useMemo } from "react";
 
 import {
+  buildEdgeConfigCache,
+  buildNodeConfigCache,
   DEFAULT_STORAGE_KEY,
-  EDGE_BASE_CONFIG,
-  NODE_BASE_CONFIG,
-} from "./constants";
-import { toLiveblocksInternalEdge, toLiveblocksInternalNode } from "./helpers";
+  toLiveblocksInternalEdge,
+  toLiveblocksInternalNode,
+} from "./helpers";
 import type {
   EdgeSyncConfig,
   InternalLiveblocksEdge,
@@ -72,42 +73,6 @@ type LiveblocksFlowSuspenseResult<
   E extends Edge = BuiltInEdge,
 > = Extract<UseLiveblocksFlowResult<N, E>, { isLoading: false }>;
 
-function mergeAndBuildDataConfigCache(
-  base: SyncConfig,
-  data?: Record<string, SyncConfig | undefined>
-): (type: string | undefined) => SyncConfig {
-  if (!data) return () => base;
-
-  const dataFallback = data["*"];
-  const fallback = dataFallback ? { ...base, data: dataFallback } : base;
-
-  // Pre-compute full node/edge sync configs for all explicitly declared types
-  const cache = new Map<string | undefined, SyncConfig>();
-  for (const type in data) {
-    if (type === "*") continue;
-    const specific = data[type];
-    if (!specific) continue;
-    const dataConfig: SyncConfig = { ...dataFallback, ...specific };
-    cache.set(type, { ...base, data: dataConfig });
-  }
-
-  return (type) => cache.get(type) || fallback;
-}
-
-function buildNodeConfigCache<N extends Node>(
-  /** The user-provided node data sync configuration, if any. */
-  nodeDataConfig?: NodeSyncConfig<N>
-): (type: string | undefined) => SyncConfig {
-  return mergeAndBuildDataConfigCache(NODE_BASE_CONFIG, nodeDataConfig);
-}
-
-function buildEdgeConfigCache<E extends Edge>(
-  /** The user-provided edge data sync configuration, if any. */
-  edgeDataConfig?: EdgeSyncConfig<E>
-): (type: string | undefined) => SyncConfig {
-  return mergeAndBuildDataConfigCache(EDGE_BASE_CONFIG, edgeDataConfig);
-}
-
 type UseLiveblocksFlowOptions<N extends Node, E extends Edge> = {
   nodes?: {
     /**`,
    },
    {
      path: "packages/liveblocks-react-flow/src/helpers.ts",
      status: "modified",
      patch: `@@ -1,14 +1,85 @@
-import type { JsonObject, SyncConfig } from "@liveblocks/core";
+import type { JsonObject, SyncConfig, SyncMode } from "@liveblocks/core";
 import { LiveObject } from "@liveblocks/core";
 import type { Edge, Node } from "@xyflow/react";
 
-import { EDGE_BASE_CONFIG, NODE_BASE_CONFIG } from "./constants";
-import type {
-  InternalLiveblocksEdge,
-  InternalLiveblocksNode,
-  LiveblocksEdge,
-  LiveblocksNode,
-} from "./types";
+import type { InternalLiveblocksEdge, InternalLiveblocksNode } from "./types";
+
+export const DEFAULT_STORAGE_KEY = "flow";
+
+// React Flow specific versions of \`SyncConfig\` that only allow keys that are actually exposed by React Flow.
+type NodeSyncConfig = { [K in keyof Node]?: SyncMode };
+type EdgeSyncConfig = { [K in keyof Edge]?: SyncMode };
+
+export const NODE_BASE_CONFIG = {
+  // Local-only (not synced)
+  selected: false,
+  dragging: false,
+  measured: false,
+  resizing: false,
+
+  // Atomic (synced as plain Json)
+  position: "atomic",
+  sourcePosition: "atomic",
+  targetPosition: "atomic",
+  extent: "atomic",
+  origin: "atomic",
+  handles: "atomic",
+
+  // Note: the \`data\` key is intentionally left out of this base config, as it
+  // is expected to be provided by the end user
+} as const satisfies NodeSyncConfig;
+
+export const EDGE_BASE_CONFIG = {
+  // Local-only (not synced)
+  selected: false,
+
+  // Atomic (synced as plain Json)
+  markerStart: "atomic",
+  markerEnd: "atomic",
+  label: "atomic",
+  labelBgPadding: "atomic",
+
+  // Note: the \`data\` key is intentionally left out of this base config, as it
+  // is expected to be provided by the end user
+} as const satisfies EdgeSyncConfig;
+
+/**
+ * Merges a base config with per-type user data configs, returning a lookup
+ * function that resolves the full SyncConfig for a given type string.
+ */
+export function buildFlowDataConfigCache(
+  base: SyncConfig,
+  data?: Record<string, SyncConfig | undefined>
+): (type: string | undefined) => SyncConfig {
+  if (!data) return () => base;
+
+  const dataFallback = data["*"];
+  const fallback = dataFallback ? { ...base, data: dataFallback } : base;
+
+  // Pre-compute full sync configs for all explicitly declared types
+  const cache = new Map<string | undefined, SyncConfig>();
+  for (const type in data) {
+    if (type === "*") continue;
+    const specific = data[type];
+    if (!specific) continue;
+    const dataConfig: SyncConfig = { ...dataFallback, ...specific };
+    cache.set(type, { ...base, data: dataConfig });
+  }
+
+  return (type) => cache.get(type) || fallback;
+}
+
+export function buildNodeConfigCache(
+  nodeDataConfig?: Record<string, SyncConfig | undefined>
+): (type: string | undefined) => SyncConfig {
+  return buildFlowDataConfigCache(NODE_BASE_CONFIG, nodeDataConfig);
+}
+
+export function buildEdgeConfigCache(
+  edgeDataConfig?: Record<string, SyncConfig | undefined>
+): (type: string | undefined) => SyncConfig {
+  return buildFlowDataConfigCache(EDGE_BASE_CONFIG, edgeDataConfig);
+}
 
 export function toLiveblocksInternalNode<N extends Node>(
   node: N,
@@ -29,39 +100,3 @@ export function toLiveblocksInternalEdge<E extends Edge>(
     config
   ) as InternalLiveblocksEdge;
 }
-
-/**
- * @experimental
- *
- * Converts a React Flow \`Node\` into a Liveblocks Storage version.
- * Keys marked \`false\` in config are set as local-only (not synced).
- * Keys marked \`"atomic"\` are stored as plain Json (no deep wrapping).
- * All other keys are deep-liveified (objects→LiveObject, arrays→LiveList).
- */
-export function toLiveblocksNode<N extends Node>(
-  node: N,
-  config?: SyncConfig
-): LiveblocksNode<N> {
-  return toLiveblocksInternalNode(node, {
-    ...NODE_BASE_CONFIG,
-    data: config,
-  }) as unknown as LiveblocksNode<N>;
-}
-
-/**
- * @experimental
- *
- * Converts a React Flow \`Edge\` into a Liveblocks Storage version.
- * Keys marked \`false\` in config are set as local-only (not synced).
- * Keys marked \`"atomic"\` are stored as plain Json (no deep wrapping).
- * All other keys are deep-liveified (objects→LiveObject, arrays→LiveList).
- */
-export function toLiveblocksEdge<E extends Edge>(
-  edge: E,
-  config?: SyncConfig
-): LiveblocksEdge<E> {
-  return toLiveblocksInternalEdge(edge, {
-    ...EDGE_BASE_CONFIG,
-    data: config,
-  }) as unknown as LiveblocksEdge<E>;
-}`,
    },
    {
      path: "packages/liveblocks-react-flow/src/index.ts",
      status: "modified",
      patch: `@@ -7,7 +7,6 @@ detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);
 export type { CursorsCursorProps, CursorsProps } from "./cursors";
 export { Cursors } from "./cursors";
 export { useLiveblocksFlow } from "./flow";
-export { toLiveblocksEdge, toLiveblocksNode } from "./helpers";
 export type {
   EdgeSyncConfig,
   LiveblocksEdge,`,
    },
    {
      path: "packages/liveblocks-react-flow/src/node.ts",
      status: "added",
      patch: `@@ -0,0 +1,294 @@
+import type { JsonObject, LsonObject } from "@liveblocks/core";
+import { LiveMap, LiveObject } from "@liveblocks/core";
+import type { BuiltInEdge, BuiltInNode, Edge, Node } from "@xyflow/react";
+
+import {
+  buildEdgeConfigCache,
+  buildNodeConfigCache,
+  DEFAULT_STORAGE_KEY,
+  toLiveblocksInternalEdge,
+  toLiveblocksInternalNode,
+} from "./helpers";
+import type {
+  EdgeSyncConfig,
+  InternalLiveblocksFlow,
+  NodeSyncConfig,
+} from "./types";
+
+/**
+ * A minimal interface for the Liveblocks Node client — just the
+ * \`mutateStorage\` method we actually need. This avoids importing
+ * \`@liveblocks/node\` as a dependency.
+ */
+interface ILiveblocksClient {
+  mutateStorage(
+    roomId: string,
+    callback: (context: {
+      root: LiveObject<LsonObject>;
+    }) => void | Promise<void>
+  ): Promise<void>;
+}
+
+/** Options for \`mutateFlow()\`. */
+export interface MutateFlowOptions<
+  N extends Node = BuiltInNode,
+  E extends Edge = BuiltInEdge,
+> {
+  client: ILiveblocksClient;
+  roomId: string;
+  storageKey?: string;
+  nodes?: { sync?: NodeSyncConfig<N> };
+  edges?: { sync?: EdgeSyncConfig<E> };
+}
+
+export interface MutableFlow<N extends Node, E extends Edge> {
+  /** The current list of nodes. */
+  readonly nodes: readonly N[];
+  /** The current list of edges. */
+  readonly edges: readonly E[];
+  /** Returns a plain object snapshot with \`nodes\` and \`edges\` arrays. */
+  toJSON(): {
+    nodes: readonly N[];
+    edges: readonly E[];
+  };
+
+  /** Returns a single node by ID, or \`undefined\` if not found. */
+  getNode(id: string): N | undefined;
+  /** Returns a single edge by ID, or \`undefined\` if not found. */
+  getEdge(id: string): E | undefined;
+
+  /** Adds a node. If a node with the same ID already exists, it is replaced. */
+  addNode(node: N): void;
+  /** Adds multiple nodes. Existing nodes with the same IDs are replaced. */
+  addNodes(nodes: N[]): void;
+  /** Updates a node by merging a partial object. No-op if the node does not exist. */
+  updateNode(id: string, partial: Partial<N>): void;
+  /** Updates a node using an updater function. Always return a new object, never mutate in-place. No-op if the node does not exist. */
+  updateNode(id: string, updater: (node: N) => N): void;
+  /** Updates a node's \`data\` by merging a partial object. No-op if the node does not exist. */
+  updateNodeData(id: string, partial: Partial<N["data"]>): void;
+  /** Updates a node's \`data\` using an updater function. Always return a new object, never mutate in-place. No-op if the node does not exist. */
+  updateNodeData<D extends N["data"]>(
+    id: string,
+    updater: (data: D) => D
+  ): void;
+  /** Removes a node by ID. */
+  removeNode(id: string): void;
+  /** Removes multiple nodes by ID. */
+  removeNodes(ids: string[]): void;
+
+  /** Adds an edge. If an edge with the same ID already exists, it is replaced. */
+  addEdge(edge: E): void;
+  /** Adds multiple edges. Existing edges with the same IDs are replaced. */
+  addEdges(edges: E[]): void;
+  /** Updates an edge by merging a partial object. No-op if the edge does not exist. */
+  updateEdge(id: string, partial: Partial<E>): void;
+  /** Updates an edge using an updater function. Always return a new object, never mutate in-place. No-op if the edge does not exist. */
+  updateEdge(id: string, updater: (edge: E) => E): void;
+  /** Updates an edge's \`data\` by merging a partial object. No-op if the edge does not exist. */
+  updateEdgeData(id: string, partial: Partial<NonNullable<E["data"]>>): void;
+  /** Updates an edge's \`data\` using an updater function. Always return a new object, never mutate in-place. No-op if the edge does not exist. */
+  updateEdgeData<D extends E["data"]>(
+    id: string,
+    updater: (data: D) => D
+  ): void;
+  /** Removes an edge by ID. */
+  removeEdge(id: string): void;
+  /** Removes multiple edges by ID. */
+  removeEdges(ids: string[]): void;
+}
+
+/**
+ * Opens a flow (a collection of React Flow nodes and edges) for reading and
+ * mutating, then automatically flushes all changes when the callback
+ * completes.
+ *
+ * @example
+ * \`\`\`ts
+ * await mutateFlow({ client, roomId: "my-room" }, (flow) => {
+ *   flow.addNode({ id: "1", position: { x: 0, y: 0 }, data: {} });
+ *   flow.updateNodeData("1", { label: "Hello" });
+ * });
+ * \`\`\`
+ */
+export async function mutateFlow<
+  N extends Node = BuiltInNode,
+  E extends Edge = BuiltInEdge,
+>(
+  options: MutateFlowOptions<N, E>,
+  callback: (flow: MutableFlow<N, E>) => void | Promise<void>
+): Promise<void> {
+  const { client, roomId } = options;
+  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
+
+  const getNodeSyncConfig = buildNodeConfigCache(options.nodes?.sync);
+  const getEdgeSyncConfig = buildEdgeConfigCache(options.edges?.sync);
+
+  const nodeListCache = new WeakMap<Record<string, N>, N[]>();
+  const edgeListCache = new WeakMap<Record<string, E>, E[]>();
+
+  await client.mutateStorage(roomId, async ({ root }) => {
+    let flow = root.get(storageKey) as InternalLiveblocksFlow | undefined;
+    if (!flow) {
+      const newFlow = new LiveObject({
+        nodes: new LiveMap(),
+        edges: new LiveMap(),
+      }) satisfies InternalLiveblocksFlow;
+      root.set(storageKey, newFlow);
+      flow = newFlow;
+    }
+
+    const nodesLiveMap = flow.get("nodes");
+    const edgesLiveMap = flow.get("edges");
+
+    function getNodes(): readonly N[] {
+      const nodeMap = nodesLiveMap.toJSON() as unknown as Record<string, N>;
+      if (!nodeListCache.has(nodeMap)) {
+        // TODO (LB-3665): To support sub-nodes, this function will need to emit nodes
+        // in topological order (parents before children), deferring any node with a
+        // parentId until its parent has been emitted.
+        nodeListCache.set(nodeMap, Object.values(nodeMap));
+      }
+      return nodeListCache.get(nodeMap)!;
+    }
+
+    function getEdges(): readonly E[] {
+      const edgeMap = edgesLiveMap.toJSON() as unknown as Record<string, E>;
+      if (!edgeListCache.has(edgeMap)) {
+        edgeListCache.set(edgeMap, Object.values(edgeMap));
+      }
+      return edgeListCache.get(edgeMap)!;
+    }
+
+    function getNode(id: string) {
+      return nodesLiveMap.get(id)?.toJSON() as N | undefined;
+    }
+    function getEdge(id: string) {
+      return edgesLiveMap.get(id)?.toJSON() as E | undefined;
+    }
+
+    function upsertNode(id: string, newNode: N) {
+      const existing = nodesLiveMap.get(id);
+      const syncConfig = getNodeSyncConfig(newNode.type);
+      if (!existing) {
+        nodesLiveMap.set(id, toLiveblocksInternalNode(newNode, syncConfig));
+      } else {
+        existing.reconcile(newNode as unknown as JsonObject, syncConfig);
+      }
+    }
+
+    function upsertEdge(id: string, newEdge: E) {
+      const existing = edgesLiveMap.get(id);
+      const syncConfig = getEdgeSyncConfig(newEdge.type);
+      if (!existing) {
+        edgesLiveMap.set(id, toLiveblocksInternalEdge(newEdge, syncConfig));
+      } else {
+        existing.reconcile(newEdge as unknown as JsonObject, syncConfig);
+      }
+    }
+
+    const mutableFlow: MutableFlow<N, E> = {
+      get nodes() {
+        return getNodes();
+      },
+      get edges() {
+        return getEdges();
+      },
+      toJSON() {
+        return { nodes: getNodes(), edges: getEdges() };
+      },
+      getNode,
+      getEdge,
+
+      addNode(node: N) {
+        upsertNode(node.id, node);
+      },
+      addNodes(nodes: N[]) {
+        for (const node of nodes) {
+          mutableFlow.addNode(node);
+        }
+      },
+      updateNode(id: string, partialOrUpdater: Partial<N> | ((node: N) => N)) {
+        const oldNode = getNode(id);
+        if (!oldNode) return;
+
+        let newNode: N;
+        if (typeof partialOrUpdater === "function") {
+          newNode = partialOrUpdater(oldNode);
+        } else {
+          newNode = { ...oldNode, ...partialOrUpdater };
+        }
+        return upsertNode(id, newNode);
+      },
+      updateNodeData(
+        id: string,
+        partialOrUpdater:
+          | Partial<N["data"]>
+          | (<D extends N["data"]>(data: D) => D)
+      ) {
+        return mutableFlow.updateNode(id, (node) => {
+          const currData = node.data ?? ({} as N["data"]);
+          const newData =
+            typeof partialOrUpdater === "function"
+              ? partialOrUpdater(currData)
+              : { ...currData, ...partialOrUpdater };
+          return { ...node, data: newData };
+        });
+      },
+      removeNode(id: string) {
+        nodesLiveMap.delete(id);
+      },
+      removeNodes(ids: string[]) {
+        for (const id of ids) {
+          nodesLiveMap.delete(id);
+        }
+      },
+
+      addEdge(edge: E) {
+        upsertEdge(edge.id, edge);
+      },
+      addEdges(edges: E[]) {
+        for (const edge of edges) {
+          mutableFlow.addEdge(edge);
+        }
+      },
+      updateEdge(id: string, partialOrUpdater: Partial<E> | ((edge: E) => E)) {
+        const oldEdge = getEdge(id);
+        if (!oldEdge) return;
+
+        let newEdge: E;
+        if (typeof partialOrUpdater === "function") {
+          newEdge = partialOrUpdater(oldEdge);
+        } else {
+          newEdge = { ...oldEdge, ...partialOrUpdater };
+        }
+        return upsertEdge(id, newEdge);
+      },
+      updateEdgeData(
+        id: string,
+        partialOrUpdater:
+          | Partial<NonNullable<E["data"]>>
+          | (<D extends E["data"]>(data: D) => D)
+      ) {
+        return mutableFlow.updateEdge(id, (edge) => {
+          const currData = edge.data;
+          const newData =
+            typeof partialOrUpdater === "function"
+              ? partialOrUpdater(currData)
+              : { ...currData, ...partialOrUpdater };
+          return { ...edge, data: newData };
+        });
+      },
+      removeEdge(id: string) {
+        edgesLiveMap.delete(id);
+      },
+      removeEdges(ids: string[]) {
+        for (const id of ids) {
+          edgesLiveMap.delete(id);
+        }
+      },
+    };
+
+    await callback(mutableFlow);
+  });
+}`,
    },
    {
      path: "packages/liveblocks-react-flow/src/types.ts",
      status: "modified",
      patch: `@@ -10,6 +10,6 @@ import type {
 } from "@liveblocks/core";
 import type { BuiltInEdge, BuiltInNode, Edge, Node } from "@xyflow/react";
 
-import type { EDGE_BASE_CONFIG, NODE_BASE_CONFIG } from "./constants";
+import type { EDGE_BASE_CONFIG, NODE_BASE_CONFIG } from "./helpers";
 
 export type { SyncConfig, SyncMode };`,
    },
    {
      path: "packages/liveblocks-react-flow/test-d/mutate-flow.test-d.ts",
      status: "added",
      patch: `@@ -0,0 +1,145 @@
+/* eslint-disable */
+
+import type { Edge, Node } from "@xyflow/react";
+import { expectError, expectType } from "tsd";
+
+import type { MutableFlow } from "../dist/node";
+
+// -- Custom types used by the tests below --
+
+type CustomNodeData = { label: string; priority: number };
+type CustomNode = Node<CustomNodeData, "task">;
+
+type CustomEdgeData = { weight: number };
+type CustomEdge = Edge<CustomEdgeData, "weighted">;
+
+/**
+ * MutableFlow with custom node/edge types — getters
+ */
+{
+  const flow = {} as MutableFlow<CustomNode, CustomEdge>;
+
+  expectType<readonly CustomNode[]>(flow.nodes);
+  expectType<readonly CustomEdge[]>(flow.edges);
+  expectType<{ nodes: readonly CustomNode[]; edges: readonly CustomEdge[] }>(
+    flow.toJSON()
+  );
+  expectType<CustomNode | undefined>(flow.getNode("n1"));
+  expectType<CustomEdge | undefined>(flow.getEdge("e1"));
+}
+
+/**
+ * MutableFlow — addNode requires correct shape
+ */
+{
+  const flow = {} as MutableFlow<CustomNode, CustomEdge>;
+
+  // Correct node should be accepted
+  flow.addNode({
+    id: "n1",
+    type: "task",
+    position: { x: 0, y: 0 },
+    data: { label: "Hello", priority: 1 },
+  });
+
+  // Missing required data field should error
+  expectError(
+    flow.addNode({
+      id: "n2",
+      type: "task",
+      position: { x: 0, y: 0 },
+      data: { label: "Hello" },
+    })
+  );
+
+  // Wrong node type should error
+  expectError(
+    flow.addNode({
+      id: "n3",
+      type: "wrong",
+      position: { x: 0, y: 0 },
+      data: { label: "Hello", priority: 1 },
+    })
+  );
+}
+
+/**
+ * MutableFlow — addEdge requires correct shape
+ */
+{
+  const flow = {} as MutableFlow<CustomNode, CustomEdge>;
+
+  // Correct edge should be accepted
+  flow.addEdge({
+    id: "e1",
+    type: "weighted",
+    source: "n1",
+    target: "n2",
+    data: { weight: 5 },
+  });
+
+  // Wrong edge type should error
+  expectError(
+    flow.addEdge({
+      id: "e2",
+      type: "wrong",
+      source: "n1",
+      target: "n2",
+      data: { weight: 5 },
+    })
+  );
+}
+
+/**
+ * MutableFlow — updateNode
+ */
+{
+  const flow = {} as MutableFlow<CustomNode, CustomEdge>;
+
+  // Partial update
+  flow.updateNode("n1", { position: { x: 10, y: 20 } });
+
+  // Updater function receives the correct type
+  flow.updateNode("n1", (node) => {
+    expectType<CustomNode>(node);
+    return { ...node, position: { x: 0, y: 0 } };
+  });
+}
+
+/**
+ * MutableFlow — updateNodeData
+ */
+{
+  const flow = {} as MutableFlow<CustomNode, CustomEdge>;
+
+  // Partial data update with known key
+  flow.updateNodeData("n1", { priority: 2 });
+
+  // Unknown data key should error
+  expectError(flow.updateNodeData("n1", { unknown: true }));
+
+  // Updater function receives the correct data type
+  flow.updateNodeData("n1", (data) => {
+    expectType<CustomNodeData>(data);
+    return { ...data, priority: data.priority + 1 };
+  });
+}
+
+/**
+ * MutableFlow — updateEdgeData
+ */
+{
+  const flow = {} as MutableFlow<CustomNode, CustomEdge>;
+
+  // Partial data update with known key
+  flow.updateEdgeData("e1", { weight: 5 });
+
+  // Unknown data key should error
+  expectError(flow.updateEdgeData("e1", { unknown: true }));
+
+  // Updater function receives possibly-undefined data (edge data is optional in React Flow)
+  flow.updateEdgeData("e1", (data) => {
+    expectType<CustomEdgeData | undefined>(data);
+    return { ...data!, weight: data!.weight + 1 };
+  });
+}`,
    },
  ],
};
