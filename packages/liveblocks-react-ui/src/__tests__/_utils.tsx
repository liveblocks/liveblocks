import type { BaseMetadata, ClientOptions, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";
import type {
  RenderHookOptions,
  RenderHookResult,
  RenderOptions,
} from "@testing-library/react";
import { render, renderHook } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";

import { RoomProvider } from "./_liveblocks.config";

/**
 * The default `RoomProvider` wrapping all tests.
 */
export function TestingRoomProvider(props: PropsWithChildren) {
  return <RoomProvider id="room">{props.children}</RoomProvider>;
}

/**
 * A version of `@testing-library/react`'s `renderHook` which uses
 * a default `RoomProvider`.
 */
function customRender(ui: ReactElement, renderOptions?: RenderOptions) {
  return render(ui, {
    wrapper: TestingRoomProvider,
    ...renderOptions,
  });
}

/**
 * A version of `@testing-library/react`'s `renderHook` which uses
 * a default `RoomProvider`.
 */
function customRenderHook<Result, Props>(
  render: (initialProps: Props) => Result,
  options?: RenderHookOptions<Props>
): RenderHookResult<Result, Props> {
  return renderHook(render, { wrapper: TestingRoomProvider, ...options });
}

export function generateFakeJwt(options: { userId: string }) {
  // I tried to generate tokens with jose lib, but couldn't because of jest
  return Promise.resolve(
    `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(
      JSON.stringify({
        k: "acc",
        pid: "test_pid",
        uid: options.userId,
        perms: { "*": ["room:write"] },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000 + 3600),
      })
    )}.${btoa("fake_signature")}`
  );
}

export function createContextsForTest<M extends BaseMetadata>(
  {
    userId,
    ...options
  }: Omit<ClientOptions, "authEndpoint" | "publicApiKey"> & {
    userId?: string;
  } = { userId: "userId" }
) {
  const clientOptions: ClientOptions = options as ClientOptions;

  if (userId) {
    clientOptions.authEndpoint = async () => {
      const token = await generateFakeJwt({ userId });
      return {
        token,
      };
    };
  } else {
    clientOptions.publicApiKey = "pk_xxx";
  }

  const client = createClient(clientOptions);

  return {
    room: createRoomContext<JsonObject, never, never, never, M>(client),
    liveblocks: createLiveblocksContext(client),
    client,
  };
}

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
