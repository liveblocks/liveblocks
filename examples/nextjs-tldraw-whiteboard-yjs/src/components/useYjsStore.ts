import { useEffect, useMemo, useState } from "react";
import { useRoom } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { YKeyValue } from "y-utility/y-keyvalue";
import * as Y from "yjs";
import {
  computed,
  createPresenceStateDerivation,
  createTLStore,
  transact,
  react,
  defaultShapeUtils,
  InstancePresenceRecordType,
  TLAnyShapeUtilConstructor,
  TLInstancePresence,
  TLRecord,
  TLStoreWithStatus,
} from "tldraw";

export function useYjsStore({
  shapeUtils = [],
  user,
}: Partial<{
  hostUrl: string;
  version: number;
  shapeUtils: TLAnyShapeUtilConstructor[];
  user: {
    // Use Computed type here
    id: string;
    color: string;
    name: string;
  };
}>) {
  // Get Liveblocks room
  const room = useRoom();

  // Set up Liveblocks Yjs and get multiplayer store
  const { yDoc, yStore, yProvider } = useMemo(() => {
    const yProvider = getYjsProviderForRoom(room);
    const yDoc = yProvider.getYDoc();
    yDoc.gc = true;
    const yArr = yDoc.getArray<{ key: string; val: TLRecord }>("tl_records");
    const yStore = new YKeyValue(yArr);

    return {
      yDoc,
      yStore,
      yProvider,
    };
  }, [room]);

  // Set up tldraw store and status
  const [store] = useState(() => {
    const store = createTLStore({
      shapeUtils: [...defaultShapeUtils, ...shapeUtils],
    });
    return store;
  });

  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
    status: "loading",
  });

  useEffect(() => {
    setStoreWithStatus({ status: "loading" });

    const unsubs: (() => void)[] = [];

    function handleSync() {
      // === DOCUMENT ==========================================================

      // Initialize tldraw with Yjs doc records, or if Yjs empty,
      // initialize the Yjs with the default store records
      if (yStore.yarray.length) {
        // Replace the tldraw records with the Yjs records
        transact(() => {
          store.clear();
          const records = yStore.yarray.toJSON().map(({ val }) => val);
          store.put(records);
        });
      } else {
        // Create the initial store records and sync to Yjs
        yDoc.transact(() => {
          for (const record of store.allRecords()) {
            yStore.set(record.id, record);
          }
        });
      }

      // Sync tldraw changes with Yjs
      unsubs.push(
        store.listen(
          function syncStoreChangesToYjsDoc({ changes }) {
            yDoc.transact(() => {
              Object.values(changes.added).forEach((record) => {
                yStore.set(record.id, record);
              });

              Object.values(changes.updated).forEach(([_, record]) => {
                yStore.set(record.id, record);
              });

              Object.values(changes.removed).forEach((record) => {
                yStore.delete(record.id);
              });
            });
          },
          { source: "user", scope: "document" } // only sync user's document changes
        )
      );

      // Sync Yjs changes with tldraw
      const handleChange = (
        changes: Map<
          string,
          | { action: "delete"; oldValue: TLRecord }
          | { action: "update"; oldValue: TLRecord; newValue: TLRecord }
          | { action: "add"; newValue: TLRecord }
        >,
        transaction: Y.Transaction
      ) => {
        if (transaction.local) return;

        const toRemove: TLRecord["id"][] = [];
        const toPut: TLRecord[] = [];

        changes.forEach((change, id) => {
          switch (change.action) {
            // Object added or updated on Liveblocks
            case "add":
            case "update": {
              const record = yStore.get(id)!;
              toPut.push(record);
              break;
            }

            // Object deleted from Liveblocks
            case "delete": {
              toRemove.push(id as TLRecord["id"]);
              break;
            }
          }
        });

        // Update tldraw with changes
        store.mergeRemoteChanges(() => {
          if (toRemove.length) {
            store.remove(toRemove);
          }
          if (toPut.length) {
            store.put(toPut);
          }
        });
      };

      yStore.on("change", handleChange);
      unsubs.push(() => yStore.off("change", handleChange));

      // === PRESENCE ==========================================================

      // Set user's info
      const userPreferences = computed<{
        id: string;
        color: string;
        name: string;
      }>("userPreferences", () => {
        if (!user) {
          throw new Error("Failed to get user");
        }
        return {
          id: user.id,
          color: user.color,
          name: user.name,
        };
      });

      // Get unique Yjs connection ID
      const self = room.getSelf();
      // @ts-ignore
      const yClientId = self?.presence.__yjs_clientid;
      const presenceId = InstancePresenceRecordType.createId(yClientId);

      // Set both
      const presenceDerivation = createPresenceStateDerivation(
        userPreferences,
        presenceId
      )(store);

      yProvider.awareness.setLocalStateField(
        "presence",
        // @ts-ignore
        presenceDerivation.get() ?? null
      );

      // Update Liveblocks when tldraw presence changes
      unsubs.push(
        react("when presence changes", () => {
          const presence = presenceDerivation.get() ?? null;
          requestAnimationFrame(() => {
            // @ts-ignore
            yProvider.awareness.setLocalStateField("presence", presence);
          });
        })
      );

      // Sync Yjs awareness with tldraw
      const handleUpdate = (update: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => {
        const states = yProvider.awareness.getStates() as Map<
          number,
          { presence: TLInstancePresence }
        >;

        const toRemove: TLInstancePresence["id"][] = [];
        const toPut: TLInstancePresence[] = [];

        // A user connected to Yjs
        for (const clientId of update.added) {
          const state = states.get(clientId);
          if (state?.presence && state.presence.id !== presenceId) {
            toPut.push(state.presence);
          }
        }

        // A user's awareness updated
        for (const clientId of update.updated) {
          const state = states.get(clientId);
          if (state?.presence && state.presence.id !== presenceId) {
            toPut.push(state.presence);
          }
        }

        // A user disconnected from Yjs
        for (const clientId of update.removed) {
          toRemove.push(
            InstancePresenceRecordType.createId(clientId.toString())
          );
        }

        // Update tldraw with changes
        store.mergeRemoteChanges(() => {
          if (toRemove.length > 0) {
            store.remove(toRemove);
          }
          if (toPut.length > 0) {
            store.put(toPut);
          }
        });
      };

      yProvider.awareness.on("change", handleUpdate);
      unsubs.push(() => yProvider.awareness.off("change", handleUpdate));

      setStoreWithStatus({
        store,
        status: "synced-remote",
        connectionStatus: "online",
      });
    }

    if (yProvider.synced) {
      handleSync();
    } else {
      yProvider.on("synced", handleSync);
      unsubs.push(() => yProvider.off("synced", handleSync));
    }

    return () => {
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
    };
  }, [yProvider, yDoc, store, yStore]);

  return storeWithStatus;
}
