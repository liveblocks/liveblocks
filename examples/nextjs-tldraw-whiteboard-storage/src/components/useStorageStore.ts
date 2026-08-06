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
import type { LiveblocksAssetStore } from "./liveblocksAssetStore";
import {
  createLiveblocksRecord,
  getLiveblocksJsonObject,
  getTldrawRecord,
  isLiveblocksRecord,
  reconcileLiveblocksRecord,
} from "./liveblocksTldrawStorage";

export function useStorageStore({
  assets,
  shapeUtils = [],
  user,
}: Partial<{
  assets: LiveblocksAssetStore;
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
      assets,
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
      // Get Liveblocks Storage values
      const { root } = await room.getStorage();
      const liveRecords = root.get("records");
      const defaultRecords = [
        DocumentRecordType.create({
          id: "document:document" as TLDocument["id"],
        }),
        PageRecordType.create({
          id: "page:page" as TLPageId,
          name: "Page 1",
          index: "a1" as IndexKey,
        }),
      ];

      room.batch(() => {
        for (const [id, liveRecord] of liveRecords.entries()) {
          if (isLiveblocksRecord(liveRecord)) {
            continue;
          }

          const record = getTldrawRecord(liveRecord);
          if (record) {
            liveRecords.set(id, createLiveblocksRecord(record));
          }
        }

        defaultRecords.forEach((record) => {
          if (!liveRecords.has(record.id)) {
            liveRecords.set(record.id, createLiveblocksRecord(record));
          }
        });
      });

      function getRecordsFromStorage() {
        const records: TLRecord[] = [];
        for (const liveRecord of liveRecords.values()) {
          const record = getTldrawRecord(liveRecord);
          if (record) {
            records.push(record);
          }
        }
        return records;
      }

      // Initialize tldraw with records from Storage
      store.clear();
      store.put(getRecordsFromStorage(), "initialize");

      // Sync tldraw changes with Storage
      unsubs.push(
        store.listen(
          ({ changes }: TLStoreEventInfo) => {
            room.batch(() => {
              Object.values(changes.added).forEach((record) => {
                liveRecords.set(record.id, createLiveblocksRecord(record));
              });

              Object.values(changes.updated).forEach(([_, record]) => {
                const liveRecord = liveRecords.get(record.id);
                if (liveRecord && isLiveblocksRecord(liveRecord)) {
                  reconcileLiveblocksRecord(liveRecord, record);
                } else {
                  liveRecords.set(record.id, createLiveblocksRecord(record));
                }
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
            room.updatePresence({
              [record.id]: getLiveblocksJsonObject(record),
            });
          });

          Object.values(changes.updated).forEach(([_, record]) => {
            room.updatePresence({
              [record.id]: getLiveblocksJsonObject(record),
            });
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
          () => {
            const toPut = getRecordsFromStorage();
            const recordIds = new Set(toPut.map((record) => record.id));
            const toRemove = store
              .allRecords()
              .filter(
                (record) =>
                  store.scopedTypes.document.has(record.typeName) &&
                  !recordIds.has(record.id)
              )
              .map((record) => record.id);

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
      const presenceRecord = presenceDerivation.get();
      room.updatePresence({
        presence: presenceRecord
          ? getLiveblocksJsonObject(presenceRecord)
          : null,
      });

      // Update Liveblocks when tldraw presence changes
      unsubs.push(
        react("when presence changes", () => {
          const presenceRecord = presenceDerivation.get();
          const presence = presenceRecord
            ? getLiveblocksJsonObject(presenceRecord)
            : null;
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
              const record = getTldrawRecord(presence?.presence);
              if (record?.typeName === "instance_presence") {
                toPut.push(record);
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
