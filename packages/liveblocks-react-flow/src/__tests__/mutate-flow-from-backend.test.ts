/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { JsonObject } from "@liveblocks/core";
import { createClient, nanoid } from "@liveblocks/core";
import { Liveblocks } from "@liveblocks/node";
import type { Node } from "@xyflow/react";
import { describe, expect, onTestFinished, test, vi } from "vitest";

import { mutateFlow } from "../node";

const DEV_SERVER = "http://localhost:1154";

const client = new Liveblocks({
  secret: "sk_localdev",
  baseUrl: DEV_SERVER,
});

/**
 * Creates a room on the dev server and optionally initializes its storage.
 */
async function initRoom(storage?: Record<string, unknown>): Promise<string> {
  const roomId = `room-${nanoid()}`;

  await fetch(`${DEV_SERVER}/v2/rooms`, {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: roomId }),
  });

  if (storage) {
    await fetch(
      `${DEV_SERVER}/v2/rooms/${encodeURIComponent(roomId)}/storage`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_localdev",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          liveblocksType: "LiveObject",
          data: storage,
        }),
      }
    );
  }

  return roomId;
}

async function getStorage(roomId: string): Promise<Record<string, unknown>> {
  const resp = await fetch(
    `${DEV_SERVER}/v2/rooms/${encodeURIComponent(roomId)}/storage?format=json`,
    { headers: { Authorization: "Bearer sk_localdev" } }
  );
  return (await resp.json()) as Record<string, unknown>;
}

/**
 * Connects a live observer client to a room via WebSocket and returns a
 * function that collects storage update batches. Useful for verifying that
 * mutations emit the expected number of ops.
 */
async function connectObserver(roomId: string) {
  const res = await fetch(`${DEV_SERVER}/v2/authorize-user`, {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: `observer-${nanoid()}`,
      userInfo: {},
      permissions: { [roomId]: ["room:write"] },
    }),
  });
  const { token } = (await res.json()) as { token: string };

  const liveClient = createClient({
    baseUrl: DEV_SERVER,
    authEndpoint: () => Promise.resolve({ token }),
    polyfills: { WebSocket: globalThis.WebSocket },
  });

  const { room, leave } = liveClient.enterRoom<JsonObject, JsonObject>(roomId, {
    initialPresence: {},
    initialStorage: {},
  });

  onTestFinished(leave);

  // Wait for connection + initial storage sync
  await vi.waitUntil(() => room.getStatus() === "connected");
  await room.getStorage();

  const batches: number[] = [];
  room.events.storageBatch.subscribe((updates) => {
    batches.push(updates.length);
  });

  return {
    room,
    /** Returns array where each element = number of updates in one batch */
    getBatches: () => batches,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mutateFlow", () => {
  // -- Empty room / initialization --

  test("auto-initializes empty flow storage when room is empty", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      expect(flow.nodes).toEqual([]);
      expect(flow.edges).toEqual([]);
    });
  });

  test("reads existing nodes and edges from storage", async () => {
    const roomId = await initRoom({
      flow: {
        liveblocksType: "LiveObject",
        data: {
          nodes: {
            liveblocksType: "LiveMap",
            data: {
              n1: {
                liveblocksType: "LiveObject",
                data: {
                  id: "n1",
                  position: {
                    liveblocksType: "LiveObject",
                    data: { x: 0, y: 0 },
                  },
                  data: {
                    liveblocksType: "LiveObject",
                    data: { label: "Hello" },
                  },
                },
              },
            },
          },
          edges: {
            liveblocksType: "LiveMap",
            data: {
              e1: {
                liveblocksType: "LiveObject",
                data: { id: "e1", source: "n1", target: "n2" },
              },
            },
          },
        },
      },
    });

    await mutateFlow({ client, roomId }, (flow) => {
      const nodes = flow.nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({ id: "n1", data: { label: "Hello" } });

      const edges = flow.edges;
      expect(edges).toHaveLength(1);
      expect(edges[0]).toMatchObject({ id: "e1", source: "n1", target: "n2" });
    });
  });

  // -- toJSON --

  test("toJSON returns both nodes and edges", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "A" },
      });
      flow.addEdge({ id: "e1", source: "n1", target: "n2" });

      const { nodes, edges } = flow;
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({ id: "n1" });
      expect(edges).toHaveLength(1);
      expect(edges[0]).toMatchObject({ id: "e1" });

      // JSON.stringify calls toJSON() automatically
      expect(JSON.parse(JSON.stringify(flow))).toEqual({
        nodes: [
          {
            id: "n1",
            type: "default",
            position: { x: 0, y: 0 },
            data: { label: "A" },
          },
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
      });
    });
  });

  // -- getNode / getEdge --

  test("getNode returns a single node by id", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNode({
        type: "default",
        id: "n1",
        position: { x: 0, y: 0 },
        data: { label: "A" },
      });
      expect(flow.getNode("n1")).toMatchObject({ id: "n1" });
      expect(flow.getNode("nope")).toBeUndefined();
    });
  });

  test("getEdge returns a single edge by id", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdge({ id: "e1", source: "n1", target: "n2" });
      expect(flow.getEdge("e1")).toMatchObject({ id: "e1" });
      expect(flow.getEdge("nope")).toBeUndefined();
    });
  });

  // -- addNode / addNodes --

  test("addNode adds a node to an empty flow", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "input",
        position: { x: 10, y: 20 },
        data: { label: "New" },
      });

      const nodes = flow.nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({
        id: "n1",
        type: "input",
        position: { x: 10, y: 20 },
        data: { label: "New" },
      });
    });

    // Verify storage was persisted
    const storage = await getStorage(roomId);
    expect(storage).toMatchObject({
      flow: { nodes: { n1: { id: "n1", type: "input" } } },
    });
  });

  test("addNodes adds multiple nodes at once", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNodes([
        {
          id: "a",
          type: "default",
          position: { x: 0, y: 0 },
          data: { label: "one" },
        },
        {
          id: "b",
          type: "default",
          position: { x: 1, y: 1 },
          data: { label: "two" },
        },
      ]);

      expect(flow.nodes).toHaveLength(2);
    });
  });

  // -- updateNode --

  test("updateNode with partial object", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNode({
        type: "default",
        id: "n1",
        position: { x: 0, y: 0 },
        data: { label: "Old" },
      });
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateNode("n1", { position: { x: 99, y: 99 } });

      const node = flow.getNode("n1");
      expect(node).toMatchObject({ position: { x: 99, y: 99 } });
      // data should still be there
      expect(node?.data).toMatchObject({ label: "Old" });
    });
  });

  test("updateNode with updater function", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNode({
        type: "default",
        id: "n1",
        position: { x: 0, y: 0 },
        data: { label: "Old" },
      });
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateNode("n1", (node) => ({
        ...node,
        position: { x: 42, y: 42 },
      }));

      expect(flow.getNode("n1")).toMatchObject({
        position: { x: 42, y: 42 },
      });
    });
  });

  test("updateNode on non-existent node is a no-op", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateNode("nonexistent", { position: { x: 1, y: 1 } });
      expect(flow.nodes).toHaveLength(0);
    });
  });

  // -- updateNodeData --

  test("updateNodeData with partial object", async () => {
    const roomId = await initRoom();

    type CustomNode = Node<{ label: string; color: string }, "custom">;

    await mutateFlow<CustomNode>({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: { label: "Hello", color: "red" },
      });
    });

    await mutateFlow<CustomNode>({ client, roomId }, (flow) => {
      flow.updateNodeData("n1", { color: "blue" });

      const node = flow.getNode("n1");
      expect(node?.data).toMatchObject({ label: "Hello", color: "blue" });
    });
  });

  test("updateNodeData with updater function", async () => {
    const roomId = await initRoom();

    type CustomNode = Node<{ count: number }, "custom">;

    await mutateFlow<CustomNode>({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: { count: 1 },
      });
    });

    await mutateFlow<CustomNode>({ client, roomId }, (flow) => {
      flow.updateNodeData("n1", (data) => ({
        ...data,
        count: (data.count ?? 0) + 1,
      }));

      expect(flow.getNode("n1")?.data).toMatchObject({ count: 2 });
    });
  });

  test("updateNodeData on non-existent node is a no-op", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateNodeData("nonexistent", { label: "X" });
      expect(flow.nodes).toHaveLength(0);
    });
  });

  // -- removeNode / removeNodes --

  test("removeNode removes a single node", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNodes([
        {
          id: "n1",
          type: "default",
          position: { x: 0, y: 0 },
          data: { label: "one" },
        },
        {
          id: "n2",
          type: "default",
          position: { x: 1, y: 1 },
          data: { label: "two" },
        },
      ]);
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.removeNode("n1");
      expect(flow.nodes).toHaveLength(1);
      expect(flow.nodes[0]).toMatchObject({ id: "n2" });
    });
  });

  test("removeNodes removes multiple nodes", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNodes([
        {
          id: "n1",
          type: "default",
          position: { x: 0, y: 0 },
          data: { label: "one" },
        },
        {
          id: "n2",
          type: "default",
          position: { x: 1, y: 1 },
          data: { label: "two" },
        },
        {
          id: "n3",
          type: "default",
          position: { x: 2, y: 2 },
          data: { label: "three" },
        },
      ]);
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.removeNodes(["n1", "n3"]);
      expect(flow.nodes).toHaveLength(1);
      expect(flow.nodes[0]).toMatchObject({ id: "n2" });
    });
  });

  // -- Edge mutations --

  test("addEdge adds an edge", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdge({ id: "e1", source: "n1", target: "n2" });
      expect(flow.edges).toHaveLength(1);
      expect(flow.edges[0]).toMatchObject({
        id: "e1",
        source: "n1",
        target: "n2",
      });
    });
  });

  test("addEdges adds multiple edges", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdges([
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ]);
      expect(flow.edges).toHaveLength(2);
    });
  });

  test("updateEdge with partial object", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdge({ id: "e1", source: "n1", target: "n2" });
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateEdge("e1", { label: "Updated" });
      expect(flow.getEdge("e1")).toMatchObject({ label: "Updated" });
    });
  });

  test("updateEdge with updater function", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdge({ id: "e1", source: "n1", target: "n2" });
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateEdge("e1", (edge) => ({ ...edge, label: "My edge" }));
      expect(flow.getEdge("e1")).toMatchObject({ label: "My edge" });
    });
  });

  test("updateEdge on non-existent edge is a no-op", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateEdge("nonexistent", { label: "X" });
      expect(flow.edges).toHaveLength(0);
    });
  });

  test("updateEdgeData with partial object", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdge({
        id: "e1",
        source: "n1",
        target: "n2",
        data: { color: "red" },
      });
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateEdgeData("e1", { color: "blue" });
      expect(flow.getEdge("e1")?.data).toMatchObject({ color: "blue" });
    });
  });

  test("updateEdgeData with updater function", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdge({
        id: "e1",
        source: "n1",
        target: "n2",
        data: { color: "red" },
      });
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateEdgeData("e1", (data) => ({
        ...data,
        color: "blue",
      }));
      expect(flow.getEdge("e1")?.data).toMatchObject({ color: "blue" });
    });
  });

  test("removeEdge removes a single edge", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdges([
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ]);
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.removeEdge("e1");
      expect(flow.edges).toHaveLength(1);
      expect(flow.edges[0]).toMatchObject({ id: "e2" });
    });
  });

  test("removeEdges removes multiple edges", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdges([
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ]);
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.removeEdges(["e1", "e2"]);
      expect(flow.edges).toHaveLength(0);
    });
  });

  // -- storageKey --

  test("uses custom storage key", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId, storageKey: "myFlow" }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "Custom" },
      });
    });

    await mutateFlow({ client, roomId, storageKey: "myFlow" }, (flow) => {
      expect(flow.nodes).toHaveLength(1);
      expect(flow.nodes[0]).toMatchObject({
        id: "n1",
        data: { label: "Custom" },
      });
    });

    // Default storage key should still be empty
    await mutateFlow({ client, roomId }, (flow) => {
      expect(flow.nodes).toHaveLength(0);
    });
  });

  // -- Persistence --

  test("mutations are persisted across separate mutateFlow calls", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "default",
        position: { x: 10, y: 20 },
        data: { label: "Test" },
      });
    });

    // Second call should see the persisted data
    await mutateFlow({ client, roomId }, (flow) => {
      const nodes = flow.nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({
        id: "n1",
        type: "default",
        position: { x: 10, y: 20 },
        data: { label: "Test" },
      });
    });
  });

  // -- Multiple mutations in one callback --

  test("multiple mutations in one callback are all applied", async () => {
    const roomId = await initRoom();

    type CustomNode = Node<{ v: number }, "custom">;

    await mutateFlow<CustomNode>({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: { v: 1 },
      });
      flow.addNode({
        id: "n2",
        type: "custom",
        position: { x: 1, y: 1 },
        data: { v: 2 },
      });
      flow.addEdge({ id: "e1", source: "n1", target: "n2" });

      expect(flow.nodes).toHaveLength(2);
      expect(flow.edges).toHaveLength(1);

      flow.updateNodeData("n1", { v: 10 });
      expect(flow.getNode("n1")?.data).toMatchObject({ v: 10 });

      flow.removeNode("n2");
      expect(flow.nodes).toHaveLength(1);
    });
  });

  // -- Sync config --

  test("respects per-type node sync config", async () => {
    const roomId = await initRoom();

    type CustomNode = Node<{ label: string; local: string }, "custom">;

    await mutateFlow<CustomNode>(
      {
        client,
        roomId,
        nodes: {
          sync: {
            custom: { local: false },
          },
        },
      },
      (flow) => {
        flow.addNode({
          id: "n1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { label: "Hello", local: "not-synced" },
        });
      }
    );

    // "local" field should not be persisted
    const storage = await getStorage(roomId);
    const nodeData = (storage as any).flow?.nodes?.n1?.data;
    expect(nodeData).toMatchObject({ label: "Hello" });
    expect(nodeData).not.toHaveProperty("local");
  });

  test("respects wildcard (*) node sync config", async () => {
    const roomId = await initRoom();

    type CustomNode = Node<{ label: string; temp: string }, "custom">;

    await mutateFlow<CustomNode>(
      {
        client,
        roomId,
        nodes: {
          sync: {
            "*": { temp: false },
          },
        },
      },
      (flow) => {
        flow.addNode({
          id: "n1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { label: "Hello", temp: "not-synced" },
        });
      }
    );

    const storage = await getStorage(roomId);
    const nodeData = (storage as any).flow?.nodes?.n1?.data;
    expect(nodeData).toMatchObject({ label: "Hello" });
    expect(nodeData).not.toHaveProperty("temp");
  });

  test("ignores undefined entries in sync config", async () => {
    const roomId = await initRoom();

    type CustomNode = Node<{ label: string }, "custom">;

    await mutateFlow<CustomNode>(
      {
        client,
        roomId,
        nodes: {
          sync: {
            custom: undefined, // Explicitly undefined — should be skipped
            "*": { label: "atomic" },
          },
        },
      },
      (flow) => {
        flow.addNode({
          id: "n1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { label: "Hello" },
        });
      }
    );

    // The wildcard config should still apply
    const storage = await getStorage(roomId);
    expect((storage as any).flow?.nodes?.n1?.data).toMatchObject({
      label: "Hello",
    });
  });

  // -- Edge data edge cases --

  test("updateEdgeData on edge with no data uses updater", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addEdge({ id: "e1", source: "n1", target: "n2" });
    });

    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateEdgeData("e1", (data) => {
        // data may be undefined for edges without initial data
        return { ...data, color: "red" };
      });

      expect(flow.getEdge("e1")?.data).toMatchObject({ color: "red" });
    });
  });

  // -- Upsert behavior --

  test("addNode overwrites existing node with same ID", async () => {
    const roomId = await initRoom();

    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "Original" },
      });

      flow.addNode({
        id: "n1",
        type: "default",
        position: { x: 99, y: 99 },
        data: { label: "Replaced" },
      });

      expect(flow.nodes).toHaveLength(1);
      expect(flow.getNode("n1")).toMatchObject({
        position: { x: 99, y: 99 },
        data: { label: "Replaced" },
      });
    });
  });

  // -- Minimal ops --

  test("updateNode with local-only field emits no ops", async () => {
    const roomId = await initRoom();

    // Set up initial node
    await mutateFlow({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "Hello" },
      });
    });

    // Connect observer before mutation
    const observer = await connectObserver(roomId);

    // Update only `selected`, which is local-only per NODE_BASE_CONFIG
    await mutateFlow({ client, roomId }, (flow) => {
      flow.updateNode("n1", { selected: true });
    });

    // Give the server a moment to propagate
    await vi.waitFor(() => {
      // No batches should arrive — `selected` is local-only
      expect(observer.getBatches()).toEqual([]);
    });
  });

  test("updateNodeData emits a single update for one field change", async () => {
    const roomId = await initRoom();

    type CustomNode = Node<{ color: string; label: string }, "custom">;

    await mutateFlow<CustomNode>({ client, roomId }, (flow) => {
      flow.addNode({
        id: "n1",
        type: "custom",
        position: { x: 0, y: 0 },
        data: { color: "red", label: "Hello" },
      });
    });

    const observer = await connectObserver(roomId);

    await mutateFlow<CustomNode>({ client, roomId }, (flow) => {
      flow.updateNodeData("n1", { color: "blue" });
    });

    await vi.waitFor(() => {
      // Expect exactly one batch with one update (only the data.color change)
      expect(observer.getBatches()).toEqual([1]);
    });
  });

  test("updateNodeData with local-only field emits no ops, synced field emits one", async () => {
    const roomId = await initRoom();

    type CustomNode = Node<{ color: string; local: string }, "custom">;

    await mutateFlow<CustomNode>(
      {
        client,
        roomId,
        nodes: { sync: { custom: { local: false } } },
      },
      (flow) => {
        flow.addNode({
          id: "n1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { color: "red", local: "initial" },
        });
      }
    );

    const observer = await connectObserver(roomId);

    await mutateFlow<CustomNode>(
      {
        client,
        roomId,
        nodes: { sync: { custom: { local: false } } },
      },
      (flow) => {
        // This should NOT propagate — `local` is marked as not synced
        flow.updateNodeData("n1", { local: "changed" });
        // This SHOULD propagate — `color` is synced
        flow.updateNodeData("n1", { color: "blue" });

        // But the local client sees both updates
        expect(flow.getNode("n1")?.data).toMatchObject({
          color: "blue",
          local: "changed",
        });
      }
    );

    await vi.waitFor(() => {
      // Only the color change should reach the observer
      expect(observer.getBatches()).toEqual([1]);
    });
  });
});
