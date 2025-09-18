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
import type {
  RenderHookOptions,
  RenderHookResult,
  RenderOptions,
} from "@testing-library/react";
import { render, renderHook } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";

import {
  createLiveblocksContext,
  getLiveblocksExtrasForClient,
} from "../liveblocks";
import { createRoomContext } from "../room";
import { RoomProvider } from "./_liveblocks.config";
import MockWebSocket from "./_MockWebSocket";

/**
 * The default `RoomProvider` wrapping all tests.
 */
export function TestingRoomProvider(props: PropsWithChildren) {
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

export function createContextsForTest<M extends BaseMetadata>(
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
  const { store: umbrellaStore } = getLiveblocksExtrasForClient<M>(client);

  return {
    room: createRoomContext<JsonObject, never, never, never, M>(client),
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
  },
  indexableFields: {
    metadata: "mixed",
  },
  allowNull: true,
});

function getFieldValue(
  thread: ThreadData<BaseMetadata>,
  field: AST.Field
): unknown {
  switch (field._kind) {
    case "DirectField":
      return thread[field.ref.name as keyof ThreadData<BaseMetadata>];

    case "KeyedField": {
      const base = thread[field.base.name as keyof ThreadData<BaseMetadata>];
      return isPlainObject(base) ? base?.[field.key] : undefined;
    }

    default:
      return assertNever(field, "Unhandled case");
  }
}

function matchesConditionGroup(
  cond: AST.ConditionGroup,
  thread: ThreadData<BaseMetadata>
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

    case "NumericCondition":
      throw new Error("Not implemented yet");

    default:
      return assertNever(cond, "Unhandled case");
  }
}

function matchesQuery(
  query: AST.Query,
  thread: ThreadData<BaseMetadata>
): boolean {
  return query.allOf.every((group) => matchesConditionGroup(group, thread));
}

export const makeThreadFilter = (queryText: string) => {
  const query = parser.parse(queryText).query;
  return (thread: ThreadData<BaseMetadata>) => matchesQuery(query, thread);
};
