import { useEffect, useState } from "react";
import { useRoom } from "@liveblocks/react/suspense";
import {
  computed,
  createPresenceStateDerivation,
  createTLStore,
  react,
  defaultShapeUtils,
  DocumentRecordType,
  InstancePresenceRecordType,
  PageRecordType,
  IndexKey,
  TLAnyShapeUtilConstructor,
  TLDocument,
  TLInstancePresence,
  TLPageId,
  TLRecord,
  TLStoreEventInfo,
  TLStoreWithStatus,
} from "tldraw";
import { LiveMap } from "@liveblocks/core";

export function useStorageStore({
  shapeUtils = [],
  user,
}: Partial<{
  hostUrl: string;
  version: number;
  shapeUtils: TLAnyShapeUtilConstructor[];
  user: {
    id: string;
    color: string;
    name: string;
  };
}>) {
  // Get Liveblocks room
  const room = useRoom();

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
    const unsubs: (() => void)[] = [];
    setStoreWithStatus({ status: "loading" });

    async function setup() {
      if (!room) return;

      const storage = await room.getStorage();
      const recordsSnapshot = room.getStorageSnapshot()?.get("records");

      console.log(recordsSnapshot);

      if (!recordsSnapshot) {
        console.log("NO RECORDS");
        // Initialize Storage with records from tldraw
        storage.root.set("records", new LiveMap());
        const liveRecords = storage.root.get("records");
        room.batch(() => {
          store.allRecords().forEach((record) => {
            liveRecords.set(record.id, record);
          });
        });
      } else {
        // Initialize tldraw with records from Storage
        store.clear();
        store.put(
          [
            DocumentRecordType.create({
              id: "document:document" as TLDocument["id"],
            }),
            PageRecordType.create({
              id: "page:page" as TLPageId,
              name: "Page 1",
              index: "a1" as IndexKey,
            }),
            ...[...recordsSnapshot.values()],
          ],
          "initialize"
        );
      }

      // LiveMap of all objects
      const liveRecords = storage.root.get("records");

      // Sync tldraw changes with Storage
      unsubs.push(
        store.listen(
          ({ changes }: TLStoreEventInfo) => {
            room.batch(() => {
              Object.values(changes.added).forEach((record) => {
                liveRecords.set(record.id, record);
              });

              Object.values(changes.updated).forEach(([_, record]) => {
                liveRecords.set(record.id, record);
              });

              Object.values(changes.removed).forEach((record) => {
                liveRecords.delete(record.id);
              });
            });
          },
          { source: "user", scope: "document" }
        )
      );

      // Sync tldraw changes with Presence
      function syncStoreWithPresence({ changes }: TLStoreEventInfo) {
        room.batch(() => {
          Object.values(changes.added).forEach((record) => {
            room.updatePresence({ [record.id]: record });
          });

          Object.values(changes.updated).forEach(([_, record]) => {
            room.updatePresence({ [record.id]: record });
          });

          Object.values(changes.removed).forEach((record) => {
            room.updatePresence({ [record.id]: null });
          });
        });
      }

      unsubs.push(
        store.listen(syncStoreWithPresence, {
          source: "user",
          scope: "session",
        })
      );

      unsubs.push(
        store.listen(syncStoreWithPresence, {
          source: "user",
          scope: "presence",
        })
      );

      unsubs.push(
        room.subscribe(
          liveRecords,
          (storageChanges) => {
            const toRemove: TLRecord["id"][] = [];
            const toPut: TLRecord[] = [];

            for (const update of storageChanges) {
              if (update.type !== "LiveMap") {
                return;
              }
              for (const [id, { type }] of Object.entries(update.updates)) {
                switch (type) {
                  // Object deleted from Liveblocks, remove from tldraw
                  case "delete": {
                    toRemove.push(id as TLRecord["id"]);
                    break;
                  }

                  // Object updated on Liveblocks, update tldraw
                  case "update": {
                    const curr = update.node.get(id);
                    if (curr) {
                      toPut.push(curr as any as TLRecord);
                    }
                    break;
                  }
                }
              }
            }

            // Update tldraw with changes
            store.mergeRemoteChanges(() => {
              if (toRemove.length) {
                store.remove(toRemove);
              }
              if (toPut.length) {
                store.put(toPut);
              }
            });
          },
          { isDeep: true }
        )
      );

      // === PRESENCE ===================================================

      // Set users name
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

      // Unique ID for this session is their connectionId
      const connectionIdString = "" + (room.getSelf()?.connectionId || 0);

      // Set both
      const presenceDerivation = createPresenceStateDerivation(
        userPreferences,
        InstancePresenceRecordType.createId(connectionIdString)
      )(store);

      // Update presence with tldraw values
      room.updatePresence({
        presence: presenceDerivation.get() ?? null,
      });

      // When the derivation change, sync presence to presence
      unsubs.push(
        react("when presence changes", () => {
          const presence = presenceDerivation.get() ?? null;
          requestAnimationFrame(() => {
            room.updatePresence({ presence });
          });
        })
      );

      // Sync room presence changes with the store
      unsubs.push(
        room.subscribe("others", (others, event) => {
          const toRemove: TLInstancePresence["id"][] = [];
          const toPut: TLInstancePresence[] = [];

          switch (event.type) {
            // A user disconnected from Liveblocks
            case "leave": {
              if (event.user.connectionId) {
                toRemove.push(
                  InstancePresenceRecordType.createId(
                    `${event.user.connectionId}`
                  )
                );
              }
              break;
            }

            // Others was reset, e.g. after losing connection and returning
            case "reset": {
              others.forEach((other) => {
                toRemove.push(
                  InstancePresenceRecordType.createId(`${other.connectionId}`)
                );
              });
              break;
            }

            // A user entered or their presence updated
            case "enter":
            case "update": {
              const presence = event?.user?.presence;
              if (presence?.presence) {
                toPut.push(event.user.presence.presence);
              }
            }
          }

          // Update tldraw with changes
          store.mergeRemoteChanges(() => {
            if (toRemove.length) {
              store.remove(toRemove);
            }
            if (toPut.length) {
              store.put(toPut);
            }
          });
        })
      );

      setStoreWithStatus({
        store,
        status: "synced-remote",
        connectionStatus: "online",
      });
    }

    setup();

    return () => {
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
    };
  }, [room, store]);

  return storeWithStatus;
}
