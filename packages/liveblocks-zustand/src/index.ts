import type {
  BaseUserMeta,
  Client,
  LiveList,
  LiveObject,
  LsonObject,
  Room,
  StorageUpdate,
  User,
} from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import type {
  Json,
  JsonArray,
  JsonObject,
  JsonScalar,
  Resolve,
} from "@liveblocks/core";
import {
  errorIf,
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "@liveblocks/core";
import create from "zustand";
import type { StateCreator, StoreMutatorIdentifier } from "zustand";

const ERROR_PREFIX = "Invalid @liveblocks/zustand middleware config.";

// type MyState = {
//   // non-JSON keys can be used in Zustand, but they cannot be used for
//   // Liveblocks data
//   now: Date;

//   cursor: Cursor | null;
//   setCursor: (cursor: Cursor | null) => void;

//   maxBears: number;
//   setMaxBears: (maxBears: number) => void;

//   bears: Bear[];
//   setBears: (bears: Bear[]) => void;
// };

// const myMapping = {
//   bears: "storage",
//   maxBears: "storage",
//   cursor: "presence",
// } as const;

// type Cursor = {
//   x: number;
//   y: number;
// };

// type Bear = {
//   name: string;
//   livingArea: string;
//   age: number;
// };

function mappingToFunctionIsNotAllowed(key: string): Error {
  return new Error(
    `${ERROR_PREFIX} mapping.${key} is invalid. Mapping to a function is not allowed.`
  );
}

function isJson(value: unknown): value is Json {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every(isJson)) ||
    (typeof value === "object" && Object.values(value).every(isJson))
  );
}

export type LiveblocksContext<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  /**
   * Enters a room and starts sync it with zustand state
   * @param roomId The id of the room
   */
  readonly enterRoom: (roomId: string) => void;

  /**
   * Leaves a room and stops sync it with zustand state.
   * @param roomId The id of the room
   */
  readonly leaveRoom: (roomId: string) => void;
  /**
   * The room currently synced to your zustand state.
   */
  readonly room: Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null;
  /**
   * Other users in the room. Empty no room is currently synced
   */
  readonly others: readonly User<TPresence, TUserMeta>[];
  /**
   * Whether or not the room storage is currently loading
   */
  readonly isStorageLoading: boolean;
  /**
   * Connection state of the room
   */
  readonly connection:
    | "closed"
    | "authenticating"
    | "unavailable"
    | "failed"
    | "open"
    | "connecting";
};

/**
 * Helper type to convert any Json value to the equivalent Lson node.
 */
// prettier-ignore
type ToLson<J extends Json> =
  J extends JsonScalar ? J :
  J extends JsonArray ? LiveList<ToLson<J[number]>> :
  J extends JsonObject ? LiveObject<ToLsonObject<J>>
  : never;

type ToLsonObject<J extends JsonObject> = Resolve<{
  [K in keyof J]:
    | ToLson<Exclude<J[K], undefined>>
    | (undefined extends J[K] ? undefined : never);
}>;

type Cast<T, V> = T extends V ? T : V;
type Write<T extends object, U extends object> = Omit<T, keyof U> & U;

declare module "zustand" {
  interface StoreMutators<S, A> {
    liveblocks: Write<Cast<S, object>, { liveblocks: A }>;
  }
}

type PresenceKeys<TState, TMapping extends MappingConfig<TState>> = {
  [K in keyof TMapping]: TMapping[K] extends "presence" ? K : never;
}[keyof TMapping] &
  keyof TState &
  string;

// type _Test1 = PresenceKeys<MyState, { bears: "storage"; cursor: "presence" }>;
// type _Test2 = StorageKeys<MyState, typeof myMapping>;

// type _Test3 = ExtractPresence<MyState, typeof myMapping>;
// type _Test4 = ExtractStorage<MyState, typeof myMapping>;

type StorageKeys<TState, TMapping extends MappingConfig<TState>> = {
  [K in keyof TMapping]: TMapping[K] extends "storage" ? K : never;
}[keyof TMapping] &
  keyof TState &
  string;

type ExtractPresence<TState, TMapping extends MappingConfig<TState>> = Cast<
  Pick<TState, PresenceKeys<TState, TMapping> & keyof TState>,
  JsonObject
>;

type ExtractStorage<
  TState,
  TMapping extends MappingConfig<TState>
> = ToLsonObject<
  Cast<Pick<TState, StorageKeys<TState, TMapping> & keyof TState>, JsonObject>
>;

type PresenceFromLiveblocksState<T> =
  // prettier-ignore
  T extends LiveblocksState<any, infer TPresence, any, any, any> ? TPresence : JsonObject;

type StorageFromLiveblocksState<T> =
  // prettier-ignore
  T extends LiveblocksState<any, any, infer TStorage, any, any> ? TStorage : LsonObject;

type UserMetaFromLiveblocksState<T> =
  // prettier-ignore
  T extends LiveblocksState<any, any, any, infer TUserMeta, any> ? TUserMeta : BaseUserMeta;

type RoomEventFromLiveblocksState<T> =
  // prettier-ignore
  T extends LiveblocksState<any, any, any, any, infer TRoomEvent> ? TRoomEvent : Json;

/**
 * A plain old JavaScript object (POJO).
 * This definition exists to enforce that a value is an actual "normal" object,
 * and not an array or iterator or something. Using this constraints makes
 * `keyof TState` always be a subset of `string`, and never `number | symbol`,
 * which would be the case for a generic `keyof T`.
 */
// type Pojo = { [key: string]: unknown };

export type LiveblocksState<
  TState,
  TPresence extends JsonObject = JsonObject,
  TStorage extends LsonObject = LsonObject,
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TRoomEvent extends Json = Json
> = TState & {
  /**
   * Liveblocks extra state attached by the middleware
   */
  readonly liveblocks: LiveblocksContext<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  >;
};

// XXX Rename to Mapping<T> eventually
type MappingConfig<TState> = {
  [K in keyof TState]?: "presence" | "storage";
};

type LLLiveblocksContext = LiveblocksContext<
  JsonObject,
  LsonObject,
  BaseUserMeta,
  Json
>;

declare function middleware<
  TState,
  // TUserMeta extends BaseUserMeta = BaseUserMeta,
  // TRoomEvent extends Json = Json,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  config: StateCreator<
    TState,
    [...Mps, ["liveblocks", LLLiveblocksContext]],
    Mcs
  >,
  options: {
    /**
     * Liveblocks client created by @liveblocks/client createClient
     */
    client: Client;

    /**
     * Mapping used to synchronize a subset of your Zustand state with your
     * Liveblocks room's Presence or Storage.
     */
    // mapping: TMapping;
  }
): StateCreator<TState, Mps, [["liveblocks", LLLiveblocksContext], ...Mcs]>;

//   const client = options.client;
//   errorIf(!client, `${ERROR_PREFIX} client is missing`);

//   const [presenceKeys, storageKeys] = validateMapping<
//     TState,
//     typeof options["mapping"]
//   >(options.mapping);

//   return (set, get, api) => {
//     type TGet = typeof get;
//     type TLiveblocksState = ReturnType<TGet>;

//     type TPresence = PresenceFromLiveblocksState<TLiveblocksState>;
//     type TStorage = StorageFromLiveblocksState<TLiveblocksState>;
//     type TUserMeta = UserMetaFromLiveblocksState<TLiveblocksState>;
//     type TRoomEvent = RoomEventFromLiveblocksState<TLiveblocksState>;

//     let room: Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null = null;
//     let isPatching: boolean = false;
//     let storageRoot: LiveObject<TStorage> | null = null;
//     let unsubscribeCallbacks: Array<() => void> = [];

//     function initialPresence(): TPresence {
//       const currState = get();
//       const result = {} as TPresence;
//       for (const key of presenceKeys) {
//         (result as any)[key] = currState[key];
//       }
//       return result;
//     }

//     function enterRoom(roomId: string) {
//       if (storageRoot) {
//         return;
//       }

//       room = client.enter(roomId, { initialPresence });

//       updateLiveblocksContext(set, {
//         isStorageLoading: true,
//         room: room as any,
//       });

//       unsubscribeCallbacks.push(
//         room.events.others.subscribe(({ others }) => {
//           updateLiveblocksContext(set, { others });
//         })
//       );

//       unsubscribeCallbacks.push(
//         room.events.connection.subscribe(() => {
//           updateLiveblocksContext(set, {
//             connection: room!.getConnectionState(),
//           });
//         })
//       );

//       unsubscribeCallbacks.push(
//         room.events.me.subscribe(() => {
//           if (isPatching === false) {
//             set(pick(room!.getPresence(), presenceKeys as any[]) as any);
//           }
//         })
//       );

//       room.getStorage().then(({ root }) => {
//         const updates: any = {};

//         room!.batch(() => {
//           for (const key of storageKeys) {
//             const liveblocksStatePart = root.get(key as any);

//             if (liveblocksStatePart == null) {
//               updates[key] = get()[key];
//               patchLiveObjectKey(root, key, undefined, get()[key]);
//             } else {
//               updates[key] = lsonToJson(liveblocksStatePart);
//             }
//           }
//         });

//         set(updates);

//         storageRoot = root;
//         unsubscribeCallbacks.push(
//           room!.subscribe(
//             root,
//             (updates) => {
//               if (isPatching === false) {
//                 // XXX This shouldn't be working with Partial<TState>, but
//                 // Pick<TState, TStorageKeys>, which is more accurate
//                 const ppp = patchState(get(), updates, storageKeys);
//                 set(ppp);
//               }
//             },
//             { isDeep: true }
//           )
//         );

//         // set isLoading storage to false once storage is loaded
//         updateLiveblocksContext(set, { isStorageLoading: false });
//       });
//     }

//     function leaveRoom(roomId: string) {
//       for (const unsubscribe of unsubscribeCallbacks) {
//         unsubscribe();
//       }
//       storageRoot = null;
//       room = null;
//       isPatching = false;
//       unsubscribeCallbacks = [];
//       client.leave(roomId);
//       updateLiveblocksContext(set, {
//         others: [],
//         connection: "closed",
//         isStorageLoading: false,
//         room: null,
//       });
//     }

//     const state = config(
//       (patch, _replace) => {
//         const oldState = get();
//         set(patch);
//         const newState = get();

//         if (room) {
//           isPatching = true;
//           updatePresence(room, oldState, newState, presenceKeys);

//           room.batch(() => {
//             if (storageRoot) {
//               patchLiveblocksStorage(
//                 storageRoot,
//                 oldState,
//                 newState,
//                 storageKeys
//               );
//             }
//           });

//           isPatching = false;
//         }
//       },
//       get,
//       api
//     );

//     return {
//       ...state,
//       liveblocks: {
//         enterRoom,
//         leaveRoom,
//         room: null,
//         others: [],
//         connection: "closed",
//         isStorageLoading: false,
//       },
//     };
//   };
// }

function patchState<TState, K extends keyof TState & string>(
  state: TState,
  updates: StorageUpdate[],
  storageKeys: K[]
) {
  const subState = pick(state, storageKeys);
  const patched = legacy_patchImmutableObject(subState, updates);
  return pick(patched, storageKeys);
}

/**
 * Creates a subset of the given object, containing only the selected keys.
 *
 * @example
 * pick({ a: 1, b: 2 }, ['a'])       // { a: 1 }
 * pick({ a: 1, b: 2 }, ['a', 'c'])  // { a: 1 }
 */
function pick<O, K extends keyof O & string>(
  obj: O,
  keys: readonly K[]
): Pick<O, K> {
  const result = {} as Pick<O, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

function updateLiveblocksContext<
  T,
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  set: (
    callbackOrPartial: (
      current: LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>
    ) =>
      | LiveblocksState<T, TPresence, TStorage, TUserMeta, TRoomEvent>
      // XXX Double-check - truly Partial?
      | Partial<any>
  ) => void,
  // XXX Double-check - truly Partial?
  partial: Partial<
    LiveblocksContext<TPresence, TStorage, TUserMeta, TRoomEvent>
  >
) {
  set((state) => ({ liveblocks: { ...state.liveblocks, ...partial } }));
}

function updatePresence<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>,
  oldState: TPresence,
  newState: TPresence,
  presenceKeys: (keyof TPresence & string)[]
) {
  for (const key of presenceKeys) {
    if (typeof newState[key] === "function") {
      throw mappingToFunctionIsNotAllowed(key);
    }

    if (oldState[key] !== newState[key]) {
      const val = newState[key] as unknown as Json | undefined;
      room.updatePresence({ [key]: val } as any);
    }
  }
}

function patchLiveblocksStorage<
  O extends LsonObject,
  TState,
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
>(
  root: LiveObject<O>,
  oldState: LiveblocksState<TState, TPresence, TStorage, TUserMeta, TRoomEvent>,
  newState: LiveblocksState<TState, TPresence, TStorage, TUserMeta, TRoomEvent>,
  storageKeys: (keyof TState & string)[]
) {
  for (const key of storageKeys) {
    if (
      process.env.NODE_ENV !== "production" &&
      typeof newState[key] === "function"
    ) {
      throw mappingToFunctionIsNotAllowed(key);
    }

    if (oldState[key] !== newState[key]) {
      const oldVal: unknown = oldState[key];
      const newVal: unknown = newState[key];

      // Ensure to only patch values that are actually legal Json values. The
      // old and new states could well contain functions (the Zustand setters),
      // and we definitely want to rule those out, even if they make it into
      // the mapping.
      if (
        (oldVal === undefined || isJson(oldVal)) &&
        (newVal === undefined || isJson(newVal))
      ) {
        patchLiveObjectKey(root, key, oldVal, newVal);
      }
    }
  }
}

/**
 * Remove false keys from mapping and generate to a new object to avoid potential mutation from outside the middleware
 */
function validateMapping<TState, TMapping extends MappingConfig<TState>>(
  mapping: TMapping
): [PresenceKeys<TState, TMapping>[], StorageKeys<TState, TMapping>[]] {
  const presenceKeys = [] as PresenceKeys<TState, TMapping>[];
  const storageKeys = [] as StorageKeys<TState, TMapping>[];

  for (const [k, value] of Object.entries(mapping)) {
    const key = k as keyof TMapping;
    if (value === "presence") {
      presenceKeys.push(key as PresenceKeys<TState, TMapping>);
    } else if (value === "storage") {
      storageKeys.push(key as StorageKeys<TState, TMapping>);
    } else {
      throw new Error(
        `${ERROR_PREFIX} mapping.${String(
          key
        )} should either be "presence" or "storage", but was: ${String(value)}`
      );
    }
  }

  return [presenceKeys, storageKeys];
}

// ---------------------------------------------------------------------------------

type Cursor = { x: number; y: number };

type MyState = {
  // non-JSON keys can be used in Zustand, but they cannot be used for
  // Liveblocks data
  now: Date;

  cursor: Cursor | null;
  setCursor: (cursor: Cursor | null) => void;

  maxBears: number;
  setMaxBears: (maxBears: number) => void;

  bears: Bear[];
  setBears: (bears: Bear[]) => void;
};

// type _Test7 = ExtractPresence<MyState, "cursor" | "setCursor">;
// type _Test8 = ExtractStorage<MyState, "bears" | "maxBears">;
// type _Test9 = LiveblocksState<MyState, "cursor", "bears" | "maxBears">;

type Bear = {
  name: string;
  livingArea: string;
  age: number;
};

const client = createClient({ authEndpoint: "/api/auth" });

const useBearStore = create<MyState>()(
  // middleware((set) =>
  // ({
  //   now: new Date(),
  //   cursor: null,
  //   setCursor: (cursor: Cursor | null) => set({ cursor }),
  //   maxBears: 0,
  //   setMaxBears: (maxBears: number) => set({ maxBears }),
  //   bears: [],
  //   setBears: (bears: Bear[]) => set({ bears }),
  // })
  // )({
  //   client,
  //   mapping: {
  //     cursor: "presence",
  //     maxBears: "storage",
  //     bears: "storage",
  //   },
  // })
  middleware(
    (set) => ({
      now: new Date(),
      cursor: null,
      setCursor: (cursor: Cursor | null) => set({ cursor }),
      maxBears: 0,
      setMaxBears: (maxBears: number) => set({ maxBears }),
      bears: [],
      setBears: (bears: Bear[]) => set({ bears }),
    }),
    { client }
  )
);

useBearStore((state) => state.bears);
useBearStore((state) => state.setBears);
useBearStore((state) => state.liveblocks);
useBearStore.liveblocks;

const enterRoom = useBearStore((state) => state.liveblocks.enterRoom);
enterRoom("my-room");
const room = useBearStore((state) => state.liveblocks.room)!;
room.getStorage().then(({ root }) => root.get("maxBears").toFixed());
room
  .getStorage()
  .then(({ root }) => root.get("bears").get(0)?.get("name").toLowerCase());
room.getSelf()!.presence.cursor;
