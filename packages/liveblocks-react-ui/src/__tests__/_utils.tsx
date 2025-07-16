import type { BaseMetadata, ClientOptions, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";
import type { RenderHookResult, RenderOptions } from "@testing-library/react";
import { render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";

import { RoomProvider } from "./_liveblocks.config";

/**
 * Testing context for all tests. Sets up a default RoomProvider to wrap all
 * tests with.
 */
export function AllTheProviders(props: { children: React.ReactNode }) {
  return (
    <RoomProvider id="room" initialPresence={() => ({})}>
      {props.children}
    </RoomProvider>
  );
}

/**
 * Wrapper for rendering components that are wrapped in a pre set up
 * <RoomProvider> context.
 */
function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Wrapper for rendering hooks that are wrapped in a pre set up
 * <RoomProvider> context.
 */
function customRenderHook<Result, Props>(
  render: (initialProps: Props) => Result,
  options?: {
    initialProps?: Props;
    wrapper?: React.JSXElementConstructor<{ children: React.ReactElement }>;
  }
): RenderHookResult<Result, Props> {
  return renderHook(render, { wrapper: AllTheProviders, ...options });
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

export function dedent(strings: TemplateStringsArray, ...values: any[]): string;
export function dedent(string: string): string;
export function dedent(
  stringOrTemplate: TemplateStringsArray | string,
  ...values: any[]
): string {
  let string: string;

  if (Array.isArray(stringOrTemplate) && "raw" in stringOrTemplate) {
    string = stringOrTemplate.reduce(
      (result, string, index) => result + string + (values[index] || ""),
      ""
    );
  } else {
    string = stringOrTemplate as string;
  }

  let lines = string.split("\n");

  const firstNonEmptyLine = lines.findIndex((line) => line.trim().length > 0);

  if (firstNonEmptyLine === -1) {
    return "";
  }

  const lastNonEmptyLine = [...lines]
    .reverse()
    .findIndex((line) => line.trim().length > 0);

  lines = lines.slice(firstNonEmptyLine, lines.length - lastNonEmptyLine);

  let minIndent = Infinity;

  for (const line of lines) {
    const lineIndent = line.search(/\S/);

    if (lineIndent !== -1) {
      minIndent = Math.min(minIndent, lineIndent);
    }
  }

  if (minIndent === Infinity) {
    minIndent = 0;
  }

  return lines
    .map((line) => {
      if (line.trim().length === 0) {
        return "";
      }

      if (line.length < minIndent) {
        return line;
      }

      return line.substring(minIndent);
    })
    .join("\n");
}

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
