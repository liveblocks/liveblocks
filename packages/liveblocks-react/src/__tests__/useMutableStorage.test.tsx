import { LiveList, LiveObject } from "@liveblocks/client";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import {
  RoomProvider,
  suspense,
  useMutableStorage,
  useMutation,
} from "./_liveblocks.config";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import { act, renderHook, screen } from "./_utils";

// Access token with perms: { "*": ["room:write"] }
const exampleToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicGlkIjoiNjA1YTRmZDMxYTM2ZDVlYTdhMmUwOGYxIiwidWlkIjoidXNlcjEiLCJwZXJtcyI6eyIqIjpbInJvb206d3JpdGUiXX0sImsiOiJhY2MifQ.OwLJdtVzMmIwIGO4gVWEJSng3DaUFsljpFXKE0Jcl1OTSHKCpDqJDkHMkkhgHmpUbBPMMdf8QmYa-4h4tMAikxzZL_tFdWQ-5kr92jOFqXPscDQTk0_GCMhv7R6vFj4YjT-msYVNVPI5M0Jlmm9fU5U_s3ZssEYhQl6AYkZT0XErrFYch8WmCVCIQ3bmFuUg5WDtnGJFiQIuCvLr0RyalJh4aILKPZ7ii_u9Q04__rN5kUhIqh2NaXWqFwsITuKaFwn24PJfBz-GJNX5Jk-tlmfJItkPFuBFp3WY8J9r9m59rJF35W_UxMU1tBNYVYRs8c3pjJKdnBiSUDUjNPvxr";

const server = setupServer(
  http.post("/api/auth", () => HttpResponse.json({ token: exampleToken }))
);

beforeAll(() => server.listen());
beforeEach(() => MockWebSocket.reset());
afterEach(() => {
  MockWebSocket.reset();
  server.resetHandlers();
});
afterAll(() => server.close());

describe("useMutableStorage (non-Suspense version)", () => {
  test("returns null before storage has loaded", () => {
    const { result } = renderHook(() => useMutableStorage());
    expect(result.current).toBeNull();
  });

  test("returns the mutable Storage root once storage has loaded", async () => {
    const { result } = renderHook(() => useMutableStorage());

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    const root = result.current;
    expect(root).toBeInstanceOf(LiveObject);
    expect(root?.get("obj").get("a")).toBe(0);
    expect(root?.get("obj").get("nested").toJSON()).toEqual(["foo", "bar"]);
  });

  test("does not re-render when the contents of Storage change", async () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useMutableStorage();
    });
    const { result: mut } = renderHook(() =>
      useMutation(({ storage }) => storage.get("obj").set("a", 1), [])
    );

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    const rendersAfterLoading = renders;
    const rootAfterLoading = result.current;

    act(() => mut.current());

    expect(result.current?.get("obj").get("a")).toBe(1);
    expect(renders).toBe(rendersAfterLoading);
    expect(result.current).toBe(rootAfterLoading); // Referentially equal!
  });
});

describe("useMutableStorage (Suspense version)", () => {
  test("suspends until storage has loaded, then returns the root", async () => {
    const { result } = renderHook(() => suspense.useMutableStorage(), {
      wrapper: ({ children }) => (
        <RoomProvider
          id="room"
          initialPresence={() => ({ x: 1 })}
          initialStorage={() => ({
            obj: new LiveObject({ a: 0, nested: new LiveList(["foo", "bar"]) }),
          })}
        >
          <Suspense fallback={<div>Loading</div>}>
            <div>Loaded</div>
            {children}
          </Suspense>
        </RoomProvider>
      ),
    });

    await vi.waitFor(() =>
      expect(screen.getByText("Loading")).toBeInTheDocument()
    );

    const sim = await websocketSimulator();
    act(() => sim.simulateStorageLoaded());

    await vi.waitFor(() =>
      expect(screen.getByText("Loaded")).toBeInTheDocument()
    );
    expect(result.current).toBeInstanceOf(LiveObject);
    expect(result.current.get("obj").get("a")).toBe(0);
  });
});
