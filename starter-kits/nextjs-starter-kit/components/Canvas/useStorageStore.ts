import { useRoom } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    let isCancelled = false;
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

      // The effect was cleaned up while Storage was loading
      if (isCancelled) {
        return;
      }

      const defaultRecords: TLRecord[] = [
        DocumentRecordType.create({
          id: "document:document" as TLDocument["id"],
        }),
        PageRecordType.create({
          id: "page:page" as TLPageId,
          name: "Page 1",
          index: "a1" as IndexKey,
        }),
      ];

      // The `records` map isn't a stable object: when several people open a
      // brand new room at the same time, they each create one to populate the
      // room's `initialStorage`, and only one of those maps wins. Never hold
      // onto the map, always read the current one and initialize it the first
      // time it's seen, otherwise reads and writes end up on a map that is no
      // longer part of Storage, and the canvas silently stops syncing.
      let knownLiveRecords: Liveblocks["Storage"]["records"] | null = null;

      function getLiveRecords() {
        const liveRecords = root.get("records");

        if (liveRecords !== knownLiveRecords) {
          knownLiveRecords = liveRecords;

          if (canWrite) {
            room.batch(() => {
              // The records tldraw needs to start up, plus everything already
              // drawn locally, so that nothing is lost if this map replaced
              // another one
              const records = [
                ...defaultRecords,
                ...store
                  .allRecords()
                  .filter((record) =>
                    store.scopedTypes.document.has(record.typeName)
                  ),
              ];

              records.forEach((record) => {
                if (!liveRecords.has(record.id)) {
                  liveRecords.set(record.id, record);
                }
              });
            });
          }
        }

        return liveRecords;
      }

      function getRecordsFromStorage(): TLRecord[] {
        return [...getLiveRecords().values()];
      }

      // Initialize tldraw with records from Storage
      store.clear();
      store.put([...defaultRecords, ...getRecordsFromStorage()], "initialize");

      // Sync tldraw changes with Storage
      if (canWrite) {
        unsubs.push(
          store.listen(
            ({ changes }: TLStoreEventInfo) => {
              const liveRecords = getLiveRecords();

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

      // Update tldraw when Storage changes. Subscribing to the root, and not to
      // the `records` map, keeps working if that map is ever replaced
      unsubs.push(
        room.subscribe(
          root,
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
      isCancelled = true;
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
    };
  }, [room, store]);

  return storeWithStatus;
}
