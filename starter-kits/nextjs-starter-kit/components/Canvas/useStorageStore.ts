import { useRoom } from "@liveblocks/react/suspense";
import { useEffect, useRef, useState } from "react";
import {
  DocumentRecordType,
  IndexKey,
  InstancePresenceRecordType,
  PageRecordType,
  TLAnyShapeUtilConstructor,
  TLDocument,
  TLInstancePresence,
  TLPageId,
  TLRecord,
  TLStoreEventInfo,
  TLStoreWithStatus,
  computed,
  createPresenceStateDerivation,
  createTLStore,
  defaultShapeUtils,
  react,
} from "tldraw";

export function useStorageStore(shapeUtils: TLAnyShapeUtilConstructor[] = []) {
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

  // Use a ref to ensure it works in callbacks after strict mode double render
  const liveRecordsRef = useRef<Liveblocks["Storage"]["records"] | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setStoreWithStatus({ status: "loading" });

    async function setup() {
      const self = room.getSelf();

      if (!self) {
        return;
      }

      // Getting authenticated user info
      const canWrite = self?.canWrite || false;
      const user = {
        id: self?.id,
        name: self?.info.name,
        color: self?.info.color,
      };

      // Get Liveblocks Storage values
      const { root } = await room.getStorage();
      const liveRecords = root.get("records");
      liveRecordsRef.current = liveRecords;

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
          ...[...liveRecords.values()],
        ],
        "initialize"
      );

      // Sync tldraw changes with Storage
      if (canWrite) {
        unsubs.push(
          store.listen(
            ({ changes }: TLStoreEventInfo) => {
              const liveRecords = liveRecordsRef.current;

              if (!liveRecords) {
                return;
              }

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
      }

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

      // Update tldraw when Storage changes
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

      // Update Liveblocks when tldraw presence changes
      unsubs.push(
        react("when presence changes", () => {
          const presence = presenceDerivation.get() ?? null;
          requestAnimationFrame(() => {
            room.updatePresence({ presence });
          });
        })
      );

      // Sync Liveblocks presence with tldraw
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
