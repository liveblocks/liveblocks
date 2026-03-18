import "@testing-library/jest-dom";

import { act, renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";

import { createLiveblocksFlow, useLiveblocksFlow } from "../flow";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import { createContextsForTest } from "./_utils";

const exampleToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicGlkIjoiNjA1YTRmZDMxYTM2ZDVlYTdhMmUwOGYxIiwidWlkIjoidXNlcjEiLCJwZXJtcyI6eyIqIjpbInJvb206d3JpdGUiXX0sImsiOiJhY2MifQ.OwLJdtVzMmIwIGO4gVWEJSng3DaUFsljpFXKE0Jcl1OTSHKCpDqJDkHMkkhgHmpUbBPMMdf8QmYa-4h4tMAikxzZL_tFdWQ-5kr92jOFqXPscDQTk0_GCMhv7R6vFj4YjT-msYVNVPI5M0Jlmm9fU5U_s3ZssEYhQl6AYkZT0XErrFYch8WmCVCIQ3bmFuUg5WDtnGJFiQIuCvLr0RyalJh4aILKPZ7ii_u9Q04__rN5kUhIqh2NaXWqFwsITuKaFwn24PJfBz-GJNX5Jk-tlmfJItkPFuBFp3WY8J9r9m59rJF35W_UxMU1tBNYVYRs8c3pjJKdnBiSUDUjNPvxr";
let requestCount = 0;
const server = setupServer(
  rest.post("/api/auth", (_, res, ctx) => {
    return res(
      ctx.json({
        token: `${exampleToken}${requestCount++}`,
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  MockWebSocket.reset();
});
beforeEach(() => {
  MockWebSocket.reset();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("useLiveblocksFlow", () => {
  describe("loading state", () => {
    test("returns isLoading: true before storage loads", () => {
      const { AllTheProviders } = createContextsForTest();

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.nodes).toBeNull();
      expect(result.current.edges).toBeNull();
    });

    test("returns isLoading: false after storage loads", async () => {
      const { AllTheProviders } = createContextsForTest();

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toEqual([]);
      expect(result.current.edges).toEqual([]);
    });
  });

  describe("initial state", () => {
    test("initial nodes and edges from options", async () => {
      const initialNodes = [
        {
          id: "1",
          position: { x: 0, y: 0 },
          data: { label: "A" },
        },
        {
          id: "2",
          position: { x: 100, y: 0 },
          data: { label: "B" },
        },
      ];
      const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges,
      });

      const { result } = renderHook(
        () =>
          useLiveblocksFlow({
            nodes: { initial: initialNodes },
            edges: { initial: initialEdges },
          }),
        {
          wrapper: ({ children }) => (
            <AllTheProviders>{children}</AllTheProviders>
          ),
        }
      );

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.nodes?.[0]?.id).toBe("1");
      expect(result.current.nodes?.[0]?.data?.label).toBe("A");
      expect(result.current.nodes?.[1]?.id).toBe("2");
      expect(result.current.edges).toHaveLength(1);
      expect(result.current.edges?.[0]?.source).toBe("1");
      expect(result.current.edges?.[0]?.target).toBe("2");
    });

    test("pre-initialized storage via RoomProvider", async () => {
      const initialNodes = [
        {
          id: "1",
          position: { x: 50, y: 50 },
          data: { label: "Pre-init" },
        },
      ];
      const initialEdges: Parameters<typeof createLiveblocksFlow>[1] = [];

      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges,
      });

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.nodes?.[0]?.data?.label).toBe("Pre-init");
      expect(result.current.edges).toHaveLength(0);
    });
  });

  describe("onNodesChange", () => {
    test("add node", async () => {
      const { AllTheProviders } = createContextsForTest();

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newNode = {
        id: "new-1",
        position: { x: 10, y: 20 },
        data: { label: "New Node" },
      };

      act(() => {
        result.current.onNodesChange([{ type: "add", item: newNode }]);
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(1);
        expect(result.current.nodes?.[0]?.id).toBe("new-1");
        expect(result.current.nodes?.[0]?.data?.label).toBe("New Node");
      });
    });

    test("remove node", async () => {
      const initialNodes = [
        {
          id: "1",
          position: { x: 0, y: 0 },
          data: { label: "To Remove" },
        },
      ];
      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges: [],
      });

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(1);
      });

      act(() => {
        result.current.onNodesChange([{ type: "remove", id: "1" }]);
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(0);
      });
    });

    test("position change", async () => {
      const initialNodes = [
        {
          id: "1",
          position: { x: 0, y: 0 },
          data: { label: "Move me" },
        },
      ];
      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges: [],
      });

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(1);
      });

      act(() => {
        result.current.onNodesChange([
          {
            type: "position",
            id: "1",
            position: { x: 100, y: 200 },
          },
        ]);
      });

      await waitFor(() => {
        expect(result.current.nodes?.[0]?.position).toEqual({
          x: 100,
          y: 200,
        });
      });
    });

    test("select node", async () => {
      const initialNodes = [
        {
          id: "1",
          position: { x: 0, y: 0 },
          data: { label: "Select me" },
        },
      ];
      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges: [],
      });

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(1);
      });

      act(() => {
        result.current.onNodesChange([
          { type: "select", id: "1", selected: true },
        ]);
      });

      await waitFor(() => {
        expect(result.current.nodes?.[0]?.selected).toBe(true);
      });
    });
  });

  describe("onEdgesChange", () => {
    test("add edge", async () => {
      const initialNodes = [
        { id: "1", position: { x: 0, y: 0 }, data: {} },
        { id: "2", position: { x: 100, y: 0 }, data: {} },
      ];
      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges: [],
      });

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(2);
      });

      const newEdge = {
        id: "e1-2",
        source: "1",
        target: "2",
      };

      act(() => {
        result.current.onEdgesChange([{ type: "add", item: newEdge }]);
      });

      await waitFor(() => {
        expect(result.current.edges).toHaveLength(1);
        expect(result.current.edges?.[0]?.source).toBe("1");
        expect(result.current.edges?.[0]?.target).toBe("2");
      });
    });

    test("remove edge", async () => {
      const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];
      const initialNodes = [
        { id: "1", position: { x: 0, y: 0 }, data: {} },
        { id: "2", position: { x: 100, y: 0 }, data: {} },
      ];
      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges,
      });

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.edges).toHaveLength(1);
      });

      act(() => {
        result.current.onEdgesChange([{ type: "remove", id: "e1-2" }]);
      });

      await waitFor(() => {
        expect(result.current.edges).toHaveLength(0);
      });
    });
  });

  describe("onConnect", () => {
    test("adds new edge", async () => {
      const initialNodes = [
        { id: "1", position: { x: 0, y: 0 }, data: {} },
        { id: "2", position: { x: 100, y: 0 }, data: {} },
      ];
      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges: [],
      });

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(2);
      });

      act(() => {
        result.current.onConnect({
          source: "1",
          target: "2",
          sourceHandle: null,
          targetHandle: null,
        });
      });

      await waitFor(() => {
        expect(result.current.edges).toHaveLength(1);
        expect(result.current.edges?.[0]?.source).toBe("1");
        expect(result.current.edges?.[0]?.target).toBe("2");
      });
    });

    test("ignores duplicate connection", async () => {
      const initialNodes = [
        { id: "1", position: { x: 0, y: 0 }, data: {} },
        { id: "2", position: { x: 100, y: 0 }, data: {} },
      ];
      const { AllTheProviders } = createContextsForTest({
        initialNodes,
        initialEdges: [],
      });

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(2);
      });

      act(() => {
        result.current.onConnect({
          source: "1",
          target: "2",
          sourceHandle: null,
          targetHandle: null,
        });
      });

      act(() => {
        result.current.onConnect({
          source: "1",
          target: "2",
          sourceHandle: null,
          targetHandle: null,
        });
      });

      await waitFor(() => {
        expect(result.current.edges).toHaveLength(1);
      });
    });
  });

  describe("options", () => {
    test("custom storageKey", async () => {
      const { room } = createContextsForTest();

      const initialNodes = [
        { id: "1", position: { x: 0, y: 0 }, data: { label: "Custom" } },
      ];

      const { result } = renderHook(
        () =>
          useLiveblocksFlow({
            storageKey: "myFlow",
            nodes: { initial: initialNodes },
            edges: { initial: [] },
          }),
        {
          wrapper: ({ children }) => (
            <room.RoomProvider
              id="room"
              initialPresence={() => ({})}
              initialStorage={() => ({
                myFlow: createLiveblocksFlow(initialNodes, []),
              })}
            >
              {children}
            </room.RoomProvider>
          ),
        }
      );

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.nodes?.[0]?.data?.label).toBe("Custom");
    });
  });

  describe("handlers", () => {
    test("returns callable onNodesChange, onEdgesChange, onConnect", async () => {
      const { AllTheProviders } = createContextsForTest();

      const { result } = renderHook(() => useLiveblocksFlow(), {
        wrapper: ({ children }) => (
          <AllTheProviders>{children}</AllTheProviders>
        ),
      });

      const sim = await websocketSimulator();
      act(() => {
        sim.simulateStorageLoaded();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.onNodesChange).toBe("function");
      expect(typeof result.current.onEdgesChange).toBe("function");
      expect(typeof result.current.onConnect).toBe("function");

      expect(() => {
        result.current.onNodesChange([]);
        result.current.onEdgesChange([]);
        result.current.onConnect({
          source: "a",
          target: "b",
          sourceHandle: null,
          targetHandle: null,
        });
      }).not.toThrow();
    });
  });
});
