import { createClient, LiveList } from "@liveblocks/client";
import type { WithLiveblocks } from "@liveblocks/zustand";
import { liveblocks as liveblocksMiddleware } from "@liveblocks/zustand";
import { devtools, persist } from "zustand/middleware";
import { create } from "zustand";
import { describe, expectTypeOf, test } from "vitest";

type MyState = {
  value: number;
  setValue: (newValue: number) => void;
};

type Presence = {
  cursor: { x: number; y: number };
};

type Storage = {
  todos: LiveList<{ text: string }>;
};

type Meta = {
  name: string;
};

type BaseUser = {
  info: Meta;
};

type RoomEvent = {
  type: "MESSAGE";
  value: string;
};

const client = createClient({ authEndpoint: "/api/auth" });

describe("WithLiveblocks middleware", () => {
  test("should infer Liveblocks types inside setValue callback", () => {
    const useStore = create<
      WithLiveblocks<MyState, Presence, Storage, BaseUser, RoomEvent>
    >()(
      devtools(
        persist(
          liveblocksMiddleware(
            (set, get) => ({
              value: 0,
              setValue: (newValue: number) => {
                const state = get();

                expectTypeOf(state.value).toEqualTypeOf<number>();
                expectTypeOf(state.setValue).toEqualTypeOf<
                  (newValue: number) => void
                >();
                expectTypeOf(
                  state.liveblocks.isStorageLoading
                ).toEqualTypeOf<boolean>();

                expectTypeOf(
                  state.liveblocks.others[0]!.presence
                ).toEqualTypeOf<Presence>();
                // @ts-expect-error - unknown presence field
                state.liveblocks.others[0]!.presence.nonexistingProperty;

                expectTypeOf(
                  state.liveblocks.others[0]!.info
                ).toEqualTypeOf<Meta>();
                // @ts-expect-error - unknown UserMeta field
                state.liveblocks.others[0]!.info.nonexistingProperty;

                state.liveblocks.room?.broadcastEvent({
                  // @ts-expect-error - invalid room event type
                  type: "INVALID_MESSAGE",
                });

                state.liveblocks.room?.getStorage().then((storage) => {
                  storage.root.get("todos");
                  // @ts-expect-error - unknown storage key
                  storage.root.get("unknown_key");
                });

                return set({ value: newValue });
              },
            }),
            {
              client,
              storageMapping: {},
              presenceMapping: { value: true },
            }
          ),
          { name: "liveblocks" }
        )
      )
    );

    useStore.getState().setValue(0);
  });

  test("should expose typed external getState()", () => {
    const useStore = create<
      WithLiveblocks<MyState, Presence, Storage, BaseUser, RoomEvent>
    >()(
      devtools(
        persist(
          liveblocksMiddleware(
            (set) => ({
              value: 0,
              setValue: (newValue: number) => set({ value: newValue }),
            }),
            {
              client,
              storageMapping: {},
              presenceMapping: { value: true },
            }
          ),
          { name: "liveblocks" }
        )
      )
    );
    const state = useStore.getState();
    expectTypeOf(state.value).toEqualTypeOf<number>();
    expectTypeOf(state.setValue).toEqualTypeOf<(newValue: number) => void>();
    expectTypeOf(state.liveblocks.isStorageLoading).toEqualTypeOf<boolean>();
    expectTypeOf(
      state.liveblocks.others[0]!.presence
    ).toEqualTypeOf<Presence>();
    // @ts-expect-error - unknown presence field
    state.liveblocks.others[0]!.presence.nonexistingProperty;
    expectTypeOf(state.liveblocks.others[0]!.info).toEqualTypeOf<Meta>();
    // @ts-expect-error - unknown UserMeta field
    state.liveblocks.others[0]!.info.nonexistingProperty;
    state.liveblocks.room?.broadcastEvent({
      // @ts-expect-error - invalid room event type
      type: "INVALID_MESSAGE",
    });
    state.liveblocks.room?.getStorage().then((storage) => {
      storage.root.get("todos");
      // @ts-expect-error - unknown storage key
      storage.root.get("unknown_key");
    });
  });

  test("should expose typed state in subscribe callback", () => {
    const useStore = create<
      WithLiveblocks<MyState, Presence, Storage, BaseUser, RoomEvent>
    >()(
      devtools(
        persist(
          liveblocksMiddleware(
            (set) => ({
              value: 0,
              setValue: (newValue: number) => set({ value: newValue }),
            }),
            {
              client,
              storageMapping: {},
              presenceMapping: { value: true },
            }
          ),
          { name: "liveblocks" }
        )
      )
    );
    useStore.subscribe((state) => {
      expectTypeOf(state.value).toEqualTypeOf<number>();
      expectTypeOf(state.setValue).toEqualTypeOf<(newValue: number) => void>();
      expectTypeOf(state.liveblocks.isStorageLoading).toEqualTypeOf<boolean>();
      expectTypeOf(
        state.liveblocks.others[0]!.presence
      ).toEqualTypeOf<Presence>();
      // @ts-expect-error - unknown presence field
      state.liveblocks.others[0]!.presence.nonexistingProperty;
      expectTypeOf(state.liveblocks.others[0]!.info).toEqualTypeOf<Meta>();
      // @ts-expect-error - unknown UserMeta field
      state.liveblocks.others[0]!.info.nonexistingProperty;
      state.liveblocks.room?.broadcastEvent({
        // @ts-expect-error - invalid room event type
        type: "INVALID_MESSAGE",
      });
      state.liveblocks.room?.getStorage().then((storage) => {
        storage.root.get("todos");
        // @ts-expect-error - unknown storage key
        storage.root.get("unknown_key");
      });
    });
  });

  test("should reject invalid presenceMapping keys", () => {
    create<WithLiveblocks<MyState, Presence, Storage, BaseUser, RoomEvent>>()(
      devtools(
        persist(
          liveblocksMiddleware(
            (set) => ({
              value: 0,
              setValue: (newValue: number) => set({ value: newValue }),
            }),
            {
              client,
              storageMapping: {},
              // @ts-expect-error - unknown presence key
              presenceMapping: { unknownKey: true },
            }
          ),
          {
            name: "liveblocks",
          }
        )
      )
    );
  });
});
