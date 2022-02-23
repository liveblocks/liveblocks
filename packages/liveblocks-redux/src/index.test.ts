import { createClient } from "@liveblocks/client";
import { plugin } from ".";

import { configureStore } from "@reduxjs/toolkit";

function prepareClientAndStore<T>(
  reducer: (state: T, action: any) => T,
  preloadedState?: T
) {
  const client = createClient({ authEndpoint: "/api/auth" });
  const store = configureStore({
    reducer,
    enhancers: [plugin(client, {})],
    preloadedState,
  });
  return { client, store };
}

describe("middleware", () => {
  test("init middleware", () => {
    const { store } = prepareClientAndStore((state) => state, { value: 0 });

    const { liveblocks, value } = store.getState();

    // Others should be empty before entering the room
    expect(liveblocks.others).toEqual([]);
    expect(value).toBe(0);
    expect(liveblocks.isStorageLoading).toBe(false);
  });
});
