import type { PlainLsonObject } from "@liveblocks/core";
import { useMutation } from "@liveblocks/react";
import { act, screen, waitFor } from "@testing-library/react";
import type { BuiltInEdge, BuiltInNode } from "@xyflow/react";
import { Suspense } from "react";
import { describe, expect, test } from "vitest";

import { useLiveblocksFlow } from "../index";
import type { LiveblocksFlow } from "../lib/types";
import { render, renderHook } from "./_utils";

const NODES: BuiltInNode[] = [
  {
    // TODO We can remove this "type" field again once @xyflow/react's release is out that includes this type fix: https://github.com/xyflow/xyflow/pull/5735
    type: "default",
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Node 1" },
  },
  {
    // TODO We can remove this "type" field again once @xyflow/react's release is out that includes this type fix: https://github.com/xyflow/xyflow/pull/5735
    type: "default",
    id: "2",
    position: { x: 100, y: 100 },
    data: { label: "Node 2" },
  },
];
const EDGES: BuiltInEdge[] = [{ id: "e1-2", source: "1", target: "2" }];

describe("useLiveblocksFlow", () => {
  test("should return loading state before storage is ready", async () => {
    const { result } = await renderHook(() => useLiveblocksFlow());

    expect(result.current.nodes).toBeNull();
    expect(result.current.edges).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(typeof result.current.onNodesChange).toBe("function");
    expect(typeof result.current.onEdgesChange).toBe("function");
    expect(typeof result.current.onConnect).toBe("function");
  });

  test("should load initial nodes and edges from options.initial", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.edges).toHaveLength(1);
    expect(result.current.nodes?.[0]).toMatchObject({
      id: "1",
      data: { label: "Node 1" },
    });
    expect(result.current.edges?.[0]).toMatchObject({
      id: "e1-2",
      source: "1",
      target: "2",
    });
  });

  test("should return empty arrays when storage is empty and no initial provided", async () => {
    const { result } = await renderHook(() => useLiveblocksFlow());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
  });

  test("should use server storage when it exists over options.initial", async () => {
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
          nodes: { initial: NODES },
          edges: { initial: EDGES },
        }),
      { initialStorage: serverStorage }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes?.[0]).toMatchObject({
      id: "server-1",
      data: { label: "From Server" },
    });
    expect(result.current.edges).toHaveLength(0);
  });

  test("should add node to flow when onNodesChange add is called", async () => {
    const { result } = await renderHook(() => useLiveblocksFlow());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newNode = {
      id: "n1",
      // TODO We can remove this "type" field again once @xyflow/react's release is out that includes this type fix: https://github.com/xyflow/xyflow/pull/5735
      type: "default",
      position: { x: 10, y: 20 },
      data: { label: "New" },
      selected: true,
    } satisfies BuiltInNode;

    act(() => {
      result.current.onNodesChange([{ type: "add", item: newNode }]);
    });

    await waitFor(() => expect(result.current.nodes).toHaveLength(1));
    expect(result.current.nodes?.[0]).toMatchObject({
      id: "n1",
      position: { x: 10, y: 20 },
      data: { label: "New" },
      selected: true,
    });
  });

  test("should add edge to flow when onEdgesChange add is called", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newEdge = {
      id: "e1-2",
      source: "1",
      target: "2",
      selected: true,
    } satisfies BuiltInEdge;

    act(() => {
      result.current.onEdgesChange([{ type: "add", item: newEdge }]);
    });

    await waitFor(() => expect(result.current.edges).toHaveLength(1));
    expect(result.current.edges?.[0]).toMatchObject({
      source: "1",
      target: "2",
      selected: true,
    });
  });

  test("should remove edge from flow when onDelete is called", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.edges).toHaveLength(1);

    act(() => {
      result.current.onDelete({
        nodes: [],
        edges: [{ id: "e1-2", source: "1", target: "2" }],
      });
    });

    await waitFor(() => expect(result.current.edges).toHaveLength(0));
  });

  test("should remove node from flow when onDelete is called", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toHaveLength(2);

    act(() => {
      result.current.onDelete({
        nodes: [NODES[0]!],
        edges: [],
      });
    });

    await waitFor(() => expect(result.current.nodes).toHaveLength(1));

    expect(result.current.nodes?.[0]).toMatchObject({ id: "2" });
  });

  test("should remove node from flow when another client deletes it", async () => {
    function useFlowWithDelete() {
      const flow = useLiveblocksFlow({
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      });
      const deleteNodeFromStorage = useMutation(({ storage }) => {
        const flow = storage.get("flow") as LiveblocksFlow;

        if (flow) {
          flow.get("nodes").delete("1");
        }
      }, []);
      return { ...flow, deleteNodeFromStorage };
    }

    const { result } = await renderHook(() => useFlowWithDelete());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onNodesChange([
        { type: "select", id: "1", selected: true },
      ]);
    });

    act(() => {
      result.current.deleteNodeFromStorage();
    });

    await waitFor(() => expect(result.current.nodes).toHaveLength(1));
    expect(result.current.nodes?.[0]).toMatchObject({ id: "2" });
  });

  test("should persist node position when onNodesChange position is called", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onNodesChange([
        { type: "position", id: "1", position: { x: 50, y: 75 } },
      ]);
    });

    await waitFor(() =>
      expect(result.current.nodes?.[0]?.position).toEqual({ x: 50, y: 75 })
    );
  });

  test("should merge local dragging state when onNodesChange position includes dragging", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onNodesChange([
        {
          type: "position",
          id: "1",
          position: { x: 50, y: 75 },
          dragging: true,
        },
      ]);
    });

    await waitFor(() =>
      expect(result.current.nodes?.[0]).toMatchObject({ dragging: true })
    );
  });

  test("should leave flow unchanged when position update targets non-existent node", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onNodesChange([
        {
          type: "position",
          id: "nonexistent",
          position: { x: 100, y: 100 },
        },
      ]);
    });

    expect(result.current.nodes).toHaveLength(2);
  });

  test("should persist node dimensions when onNodesChange dimensions is called", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onNodesChange([
        {
          type: "dimensions",
          id: "1",
          dimensions: { width: 200, height: 100 },
          setAttributes: true,
          resizing: true,
        },
      ]);
    });

    await waitFor(() =>
      expect(result.current.nodes?.[0]).toMatchObject({
        width: 200,
        height: 100,
        resizing: true,
      })
    );
  });

  test("should show node as selected when selected", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onNodesChange([
        { type: "select", id: "1", selected: true },
      ]);
    });

    await waitFor(() =>
      expect(result.current.nodes?.[0]).toMatchObject({ selected: true })
    );
  });

  test("should deselect node when selection is cleared", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onNodesChange([
        { type: "select", id: "1", selected: true },
      ]);
    });

    act(() => {
      result.current.onNodesChange([
        { type: "select", id: "1", selected: false },
      ]);
    });

    await waitFor(() => {
      expect(result.current.nodes?.[0]?.selected).toBeFalsy();
    });
  });

  test("should show edge as selected when selected", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onEdgesChange([
        { type: "select", id: "e1-2", selected: true },
      ]);
    });

    await waitFor(() =>
      expect(result.current.edges?.[0]).toMatchObject({ selected: true })
    );
  });

  test("should add edge on onConnect and skip duplicate connections", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
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

  test("should add multiple edges between same nodes when using different handles", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onConnect({
        source: "1",
        target: "2",
        sourceHandle: "a",
        targetHandle: null,
      });
    });

    await waitFor(() => expect(result.current.edges).toHaveLength(1));

    act(() => {
      result.current.onConnect({
        source: "1",
        target: "2",
        sourceHandle: "b",
        targetHandle: null,
      });
    });

    await waitFor(() => expect(result.current.edges).toHaveLength(2));

    const handles = result.current.edges?.map((e) => e.sourceHandle) ?? [];
    expect(handles).toContain("a");
    expect(handles).toContain("b");
  });

  test("should keep stable references for unchanged nodes across rerenders", async () => {
    const { result, rerender } = await renderHook(() =>
      useLiveblocksFlow({
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const nodes1 = result.current.nodes;

    rerender();

    const nodes2 = result.current.nodes;
    expect(nodes2).toEqual(nodes1);
    expect(nodes2?.[0]).toBe(nodes1?.[0]);
    expect(nodes2?.[1]).toBe(nodes1?.[1]);
  });

  test("should keep stable references for unchanged edges across rerenders", async () => {
    const { result, rerender } = await renderHook(() =>
      useLiveblocksFlow({
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const edges1 = result.current.edges;

    rerender();

    const edges2 = result.current.edges;
    expect(edges2).toEqual(edges1);
    expect(edges2?.[0]).toBe(edges1?.[0]);
  });

  test("should use custom storage key when provided", async () => {
    const { result } = await renderHook(() =>
      useLiveblocksFlow({ storageKey: "myFlow", nodes: { initial: NODES } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toHaveLength(2);
  });
});

describe("useLiveblocksFlow (Suspense)", () => {
  test("should suspend until storage is ready, then return nodes and edges", async () => {
    function Flow() {
      const { nodes, edges, isLoading } = useLiveblocksFlow({
        suspense: true,
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      });

      return (
        <div data-testid="flow">
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

    await waitFor(() => expect(screen.getByTestId("flow")).toBeInTheDocument());

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("node-count").textContent).toBe("2");
    expect(screen.getByTestId("edge-count").textContent).toBe("1");
  });

  test("should render with empty arrays when storage is empty", async () => {
    function Flow() {
      const { nodes, edges, isLoading } = useLiveblocksFlow({ suspense: true });

      return (
        <div data-testid="flow">
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

    await waitFor(() => expect(screen.getByTestId("flow")).toBeInTheDocument());

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("node-count").textContent).toBe("0");
    expect(screen.getByTestId("edge-count").textContent).toBe("0");
  });

  test("should match non-Suspense data after load", async () => {
    function Flow() {
      const { nodes, edges } = useLiveblocksFlow({
        suspense: true,
        nodes: { initial: NODES },
        edges: { initial: EDGES },
      });

      return (
        <div data-testid="flow">
          <span data-testid="node-label">{nodes[0]?.data.label}</span>
          <span data-testid="edge-id">{edges[0]?.id}</span>
        </div>
      );
    }

    await render(
      <Suspense fallback={<div data-testid="fallback">Loading…</div>}>
        <Flow />
      </Suspense>
    );

    await waitFor(() => expect(screen.getByTestId("flow")).toBeInTheDocument());

    expect(screen.getByTestId("node-label").textContent).toBe("Node 1");
    expect(screen.getByTestId("edge-id").textContent).toBe("e1-2");
  });
});
