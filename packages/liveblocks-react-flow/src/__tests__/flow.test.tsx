import type { PlainLsonObject } from "@liveblocks/core";
import { act, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, test } from "vitest";

import type { SerializableEdge, SerializableNode } from "../flow";
import { createLiveblocksFlow, useLiveblocksFlow } from "../index";
import { useLiveblocksFlow as useLiveblocksFlowSuspense } from "../suspense";
import { render, renderHook } from "./_utils";

const NODES = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "2", position: { x: 100, y: 100 }, data: { label: "Node 2" } },
] satisfies SerializableNode[];
const EDGES = [
  { id: "e1-2", source: "1", target: "2" },
] satisfies SerializableEdge[];

describe("createLiveblocksFlow", () => {
  test("should initialize a flow with nodes and edges", () => {
    const flow = createLiveblocksFlow(NODES, EDGES);

    expect(flow.get("nodes").size).toBe(2);
    expect(flow.get("edges").size).toBe(1);
    expect(flow.get("nodes").get("1")?.get("data").get("label")).toBe("Node 1");
    expect(flow.get("edges").get("e1-2")?.get("source")).toBe("1");
  });

  test("should support initializing an empty flow", () => {
    const flow = createLiveblocksFlow();

    expect(flow.get("nodes").size).toBe(0);
    expect(flow.get("edges").size).toBe(0);
  });
});

describe("useLiveblocksFlow", () => {
  test("should return nodes: null, edges: null, isLoading: true before storage is ready", async () => {
    const { result } = await renderHook(() => useLiveblocksFlow());

    expect(result.current.nodes).toBeNull();
    expect(result.current.edges).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(typeof result.current.onNodesChange).toBe("function");
    expect(typeof result.current.onEdgesChange).toBe("function");
    expect(typeof result.current.onConnect).toBe("function");
  });

  test("should write options.initial into empty storage and expose nodes/edges after load", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        initial: { nodes: NODES, edges: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.edges).toHaveLength(1);
    expect(result.current.nodes![0]!.id).toBe("1");
    expect(result.current.nodes![0]!.data.label).toBe("Node 1");
    expect(result.current.edges![0]!.id).toBe("e1-2");
    expect(result.current.edges![0]!.source).toBe("1");
    expect(result.current.edges![0]!.target).toBe("2");
  });

  test("should resolve empty storage with no initial to empty arrays", async () => {
    const { result } = await renderHook(() => useLiveblocksFlow());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
  });

  test("should prefer existing server-side storage over options.initial", async () => {
    const serverStorage: PlainLsonObject = {
      liveblocksType: "LiveObject",
      data: {
        flow: {
          liveblocksType: "LiveObject",
          data: {
            nodes: {
              liveblocksType: "LiveMap",
              data: {
                "server-1": {
                  liveblocksType: "LiveObject",
                  data: {
                    id: "server-1",
                    position: { x: 99, y: 99 },
                    data: {
                      liveblocksType: "LiveObject",
                      data: { label: "From Server" },
                    },
                  },
                },
              },
            },
            edges: { liveblocksType: "LiveMap", data: {} },
          },
        },
      },
    };

    const { result } = await renderHook(
      () =>
        useLiveblocksFlow({
          initial: { nodes: NODES, edges: EDGES },
        }),
      { initialStorage: serverStorage }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes![0]!.id).toBe("server-1");
    expect(result.current.nodes![0]!.data.label).toBe("From Server");
    expect(result.current.edges).toHaveLength(0);
  });

  test("should write node to storage when onNodesChange add is called", async () => {
    const { result } = await renderHook(() => useLiveblocksFlow());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newNode: SerializableNode = {
      id: "n1",
      position: { x: 10, y: 20 },
      data: { label: "New" },
      selected: true,
    };

    act(() => {
      result.current.onNodesChange([{ type: "add", item: newNode }]);
    });

    await waitFor(() => expect(result.current.nodes).toHaveLength(1));

    const node = result.current.nodes![0];
    expect(node!.id).toBe("n1");
    expect(node!.position).toEqual({ x: 10, y: 20 });
    expect((node!.data as { label: string }).label).toBe("New");
    expect(node!.selected).toBe(true);
  });

  test("should write edge to storage when onEdgesChange add is called", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow<SerializableNode, SerializableEdge>({
        initial: { nodes: NODES, edges: [] },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newEdge: SerializableEdge = {
      id: "e1-2",
      source: "1",
      target: "2",
    };

    act(() => {
      result.current.onEdgesChange([{ type: "add", item: newEdge }]);
    });

    await waitFor(() => expect(result.current.edges).toHaveLength(1));

    expect(result.current.edges![0]!.source).toBe("1");
    expect(result.current.edges![0]!.target).toBe("2");
  });

  test("should delete edge from storage when onEdgesChange remove is called", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        initial: { nodes: NODES, edges: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.edges).toHaveLength(1);

    act(() => {
      result.current.onEdgesChange([{ type: "remove", id: "e1-2" }]);
    });

    await waitFor(() => expect(result.current.edges).toHaveLength(0));
  });

  test("should delete node from storage when onNodesChange remove is called", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        initial: { nodes: NODES, edges: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toHaveLength(2);

    act(() => {
      result.current.onNodesChange([{ type: "remove", id: "1" }]);
    });

    await waitFor(() => expect(result.current.nodes).toHaveLength(1));

    expect(result.current.nodes![0]!.id).toBe("2");
  });

  test("should add new edge on onConnect and skip duplicate connections", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        initial: { nodes: NODES, edges: [] },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onConnect({
        source: "1",
        target: "2",
        sourceHandle: null,
        targetHandle: null,
      });
    });

    await waitFor(() => expect(result.current.edges).toHaveLength(1));

    act(() => {
      result.current.onConnect({
        source: "1",
        target: "2",
        sourceHandle: null,
        targetHandle: null,
      });
    });

    expect(result.current.edges).toHaveLength(1);
  });

  test("should keep stable references for unchanged nodes across rerenders", async () => {
    const { result, rerender } = await renderHook(() =>
      useLiveblocksFlow({
        initial: { nodes: NODES, edges: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const nodes1 = result.current.nodes!;

    rerender();

    const nodes2 = result.current.nodes!;

    expect(nodes1).toEqual(nodes2);
    expect(nodes1[0]).toBe(nodes2[0]);
    expect(nodes1[1]).toBe(nodes2[1]);
  });

  test("should respect custom storageKey", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        storageKey: "myFlow",
        initial: { nodes: NODES, edges: [] },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toHaveLength(2);
  });
});

describe("useLiveblocksFlow (Suspense)", () => {
  test("should suspend until storage is ready, then return isLoading: false and arrays", async () => {
    function Flow() {
      const { nodes, edges, isLoading } = useLiveblocksFlowSuspense({
        initial: { nodes: NODES, edges: EDGES },
      });

      return (
        <div data-testid="flow-content">
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="node-count">{nodes.length}</span>
          <span data-testid="edge-count">{edges.length}</span>
        </div>
      );
    }

    await render(
      <Suspense fallback={<div data-testid="fallback">Loading…</div>}>
        <Flow />
      </Suspense>
    );

    expect(screen.getByTestId("fallback")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("flow-content")).toBeInTheDocument()
    );

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("node-count").textContent).toBe("2");
    expect(screen.getByTestId("edge-count").textContent).toBe("1");
  });

  test("should resolve empty storage to empty arrays with isLoading: false", async () => {
    function Flow() {
      const { nodes, edges, isLoading } = useLiveblocksFlowSuspense();

      return (
        <div data-testid="flow-content">
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="node-count">{nodes.length}</span>
          <span data-testid="edge-count">{edges.length}</span>
        </div>
      );
    }

    await render(
      <Suspense fallback={<div data-testid="fallback">Loading…</div>}>
        <Flow />
      </Suspense>
    );

    await waitFor(() =>
      expect(screen.getByTestId("flow-content")).toBeInTheDocument()
    );

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("node-count").textContent).toBe("0");
    expect(screen.getByTestId("edge-count").textContent).toBe("0");
  });

  test("should match non-Suspense data after load", async () => {
    function Flow() {
      const { nodes, edges } = useLiveblocksFlowSuspense({
        initial: { nodes: NODES, edges: EDGES },
      });

      return (
        <div data-testid="flow-content">
          {nodes[0]?.data.label}
          {edges[0]?.id}
        </div>
      );
    }

    await render(
      <Suspense fallback={<div data-testid="fallback">Loading…</div>}>
        <Flow />
      </Suspense>
    );

    await waitFor(() =>
      expect(screen.getByTestId("flow-content")).toBeInTheDocument()
    );

    expect(screen.getByTestId("flow-content").textContent).toContain("Node 1");
    expect(screen.getByTestId("flow-content").textContent).toContain("e1-2");
  });
});
