import type {
  BaseMetadata,
  ClientOptions,
  JsonObject,
  ThreadData,
} from "@liveblocks/client";
import { createClient, LiveList, LiveObject } from "@liveblocks/client";
import { assertNever, isPlainObject } from "@liveblocks/core";
import type { AST } from "@liveblocks/query-parser";
import { QueryParser } from "@liveblocks/query-parser";
import type { RenderHookResult, RenderOptions } from "@testing-library/react";
import { render, renderHook } from "@testing-library/react";
import type { JSXElementConstructor, ReactElement, ReactNode } from "react";

import {
  createLiveblocksContext,
  getLiveblocksExtrasForClient,
} from "../liveblocks";
import { createRoomContext } from "../room";
import { RoomProvider } from "./_liveblocks.config";
import MockWebSocket from "./_MockWebSocket";

/**
 * Testing context for all tests. Sets up a default RoomProvider to wrap all
 * tests with.
 */
export function AllTheProviders(props: { children: ReactNode }) {
  return (
    <RoomProvider
      id="room"
      initialPresence={() => ({ x: 1 })}
      initialStorage={() => ({
        obj: new LiveObject({
          a: 0,
          nested: new LiveList(["foo", "bar"]),
        }),
      })}
    >
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
    wrapper?: JSXElementConstructor<{ children: ReactNode }>;
  }
): RenderHookResult<Result, Props> {
  return renderHook(render, { wrapper: AllTheProviders, ...options });
}

export function createContextsForTest<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  {
    userId,
    ...options
  }: Omit<ClientOptions, "authEndpoint" | "publicApiKey"> & {
    userId?: string;
  } = { userId: "userId" }
) {
  const clientOptions: ClientOptions = {
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
    ...options,
  } as ClientOptions;

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
  const { store: umbrellaStore } = getLiveblocksExtrasForClient<TM, CM>(client);

  return {
    room: createRoomContext<JsonObject, never, never, never, TM, CM>(client),
    liveblocks: createLiveblocksContext(client),
    client,
    umbrellaStore,
  };
}

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };

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

// NOTE: This parser definition should match the backend!
// See https://github.com/liveblocks/liveblocks-backend/blob/ca297795/shared/postgres-prisma/src/queryParsers/parseThreadQuery.ts#L15-L23
const parser = new QueryParser({
  fields: {
    resolved: "boolean",
    subscribed: "boolean",
  },
  indexableFields: {
    metadata: "mixed",
  },
  allowNull: true,
});

function getFieldValue(thread: ThreadData, field: AST.Field): unknown {
  switch (field._kind) {
    case "DirectField":
      return thread[field.ref.name as keyof ThreadData];

    case "KeyedField": {
      const base = thread[field.base.name as keyof ThreadData];
      return isPlainObject(base) ? base?.[field.key] : undefined;
    }

    default:
      return assertNever(field, "Unhandled case");
  }
}

function matchesConditionGroup(
  cond: AST.ConditionGroup,
  thread: ThreadData
): boolean {
  switch (cond._kind) {
    case "OrCondition":
    case "NotCondition":
      throw new Error("Not supported");

    case "ExactCondition": {
      const actual = getFieldValue(thread, cond.field);
      const expected = cond.value.value === null ? undefined : cond.value.value;
      return actual === expected;
    }

    case "PrefixCondition": {
      const actual = getFieldValue(thread, cond.field);
      const expected = cond.prefix.value;
      return typeof actual === "string" && actual.startsWith(expected);
    }

    case "NumericCondition": {
      const actual = getFieldValue(thread, cond.field);
      const expected = cond.value.value;
      switch (cond.op) {
        case ">":
          return typeof actual === "number" && actual > expected;
        case ">=":
          return typeof actual === "number" && actual >= expected;
        case "<":
          return typeof actual === "number" && actual < expected;
        case "<=":
          return typeof actual === "number" && actual <= expected;
        default:
          throw new Error(`Unknown numeric operator: ${cond.op}`);
      }
    }

    default:
      return assertNever(cond, "Unhandled case");
  }
}

function matchesQuery(query: AST.Query, thread: ThreadData): boolean {
  return query.allOf.every((group) => matchesConditionGroup(group, thread));
}

export const makeThreadFilter = (queryText: string) => {
  const query = parser.parse(queryText).query;
  return (thread: ThreadData) => matchesQuery(query, thread);
};
