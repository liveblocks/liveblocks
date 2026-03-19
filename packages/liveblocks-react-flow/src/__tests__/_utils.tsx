import { createClient, nanoid, type PlainLsonObject } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { onTestFinished } from "vitest";

const DEV_SERVER = "http://localhost:1154";

/**
 * Creates a room on the dev server and optionally initializes its storage.
 */
export async function initRoom(storage?: PlainLsonObject): Promise<string> {
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
        body: JSON.stringify(storage),
      }
    );
  }

  return roomId;
}

async function UNSAFE_generateAccessToken(roomId?: string) {
  const res = await fetch(`${DEV_SERVER}/v2/authorize-user`, {
    method: "POST",
    headers: {
      // ⚠️ WARNING ⚠️
      // DO NOT USE THIS IN PRODUCTION!
      // Never expose your secret key on the client in production this way!
      // We only do this here because these tests don't have a backend.
      // Do not treat this setup as a reference for how to implement
      // authentication in your app.
      Authorization: "Bearer sk_localdev",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: `user-${nanoid()}`,
      userInfo: { name: "Testy McTester" },
      permissions: { [roomId!]: ["room:write"] },
    }),
  });

  return (await res.json()) as { token: string };
}

/**
 * Creates a fresh Liveblocks client + RoomContext pointing at the local dev
 * server. Call this once per test so each test gets an isolated client.
 */
export function createTestRoomContext() {
  const client = createClient({
    baseUrl: DEV_SERVER,
    authEndpoint: UNSAFE_generateAccessToken,
    polyfills: { WebSocket: globalThis.WebSocket },
    // @ts-expect-error internal option to disable throttling for tests
    __DANGEROUSLY_disableThrottling: true,
  });

  return createRoomContext(client);
}

/**
 * Creates a RoomProvider wrapper for the given room. Call once per test so each
 * test gets an isolated client.
 */
export function createRoomProviderWrapper(roomId: string) {
  const { RoomProvider } = createTestRoomContext();

  return function Wrapper({ children }: { children: ReactNode }) {
    return <RoomProvider id={roomId}>{children}</RoomProvider>;
  };
}

/**
 * Renders a hook with a RoomProvider connected to the dev server. Handles
 * initRoom, wrapper setup, and onTestFinished(unmount) for cleanup.
 */
async function customRenderHook<Result, Props>(
  hook: (initialProps: Props) => Result,
  options?: RenderHookOptions<Props> & { initialStorage?: PlainLsonObject }
) {
  const roomId = await initRoom(options?.initialStorage);
  const wrapper = createRoomProviderWrapper(roomId);
  const result = renderHook(hook, { wrapper });

  onTestFinished(result.unmount);

  return { ...result, roomId };
}

/**
 * Renders UI with a RoomProvider connected to the dev server. Handles
 * initRoom, wrapper setup, and onTestFinished(unmount) for cleanup.
 */
async function customRender(
  ui: ReactNode,
  options?: RenderOptions & { initialStorage?: PlainLsonObject }
) {
  const roomId = await initRoom(options?.initialStorage);
  const Wrapper = createRoomProviderWrapper(roomId);
  const result = render(<Wrapper>{ui}</Wrapper>);

  onTestFinished(result.unmount);

  return { ...result, roomId };
}

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
