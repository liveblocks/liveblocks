"use client";

import { useSelf, useRoom } from "@liveblocks/react/suspense";
import type { LiveMap } from "@liveblocks/client";
import { useEffect, useRef, useState } from "react";
import {
  InstancePresenceRecordType,
  computed,
  createPresenceStateDerivation,
  createUserId,
  DocumentRecordType,
  PageRecordType,
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  react,
  type IndexKey,
  type TLAnyBindingUtilConstructor,
  type TLAnyShapeUtilConstructor,
  type TLDocument,
  type TLInstancePresence,
  type TLPageId,
  type TLRecord,
  type TLStore,
  type TLStoreEventInfo,
  type TLUser,
} from "tldraw";
import { normalizeShapeLikeRecord } from "@/lib/htmlBox";

type StorageRecord = Liveblocks["Storage"]["records"] extends LiveMap<
  string,
  infer TValue
>
  ? TValue
  : never;

type UseStorageStoreOptions = {
  shapeUtils?: TLAnyShapeUtilConstructor[];
  bindingUtils?: TLAnyBindingUtilConstructor[];
};

function normalizeRecord(record: TLRecord): TLRecord {
  return normalizeShapeLikeRecord(
    record as unknown as Record<string, unknown>
  ) as unknown as TLRecord;
}

export function useStorageStore({
  shapeUtils = [],
  bindingUtils = [],
}: UseStorageStoreOptions = {}) {
  const room = useRoom();
  const canWrite = useSelf((me) => me.canWrite);
  const id = useSelf((me) => me.id);
  const info = useSelf((me) => me.info);
  const [isReady, setIsReady] = useState(false);
  const [store] = useState<TLStore>(() =>
    createTLStore({
      shapeUtils: [...defaultShapeUtils, ...shapeUtils],
      bindingUtils: [...defaultBindingUtils, ...bindingUtils],
    })
  );
  const remoteCacheRef = useRef(new Map<string, TLRecord>());

  useEffect(() => {
    let isDisposed = false;
    const unsubs: Array<() => void> = [];

    async function setup() {
      setIsReady(false);
      const { root } = await room.getStorage();
      const records = root.get("records");

      const currentRemote = new Map<string, TLRecord>();
      for (const [id, record] of records.entries()) {
        // XXX Liveblocks storage typing is JSON-ish while this map contains TLRecord payloads.
        currentRemote.set(
          id,
          normalizeRecord(record as unknown as TLRecord)
        );
      }
      remoteCacheRef.current = currentRemote;

      const bootstrapRecords: TLRecord[] = [];
      if (!currentRemote.has("document:document")) {
        bootstrapRecords.push(
          DocumentRecordType.create({
            id: "document:document" as TLDocument["id"],
          })
        );
      }
      if (!currentRemote.has("page:page")) {
        bootstrapRecords.push(
          PageRecordType.create({
            id: "page:page" as TLPageId,
            name: "Page 1",
            index: "a1" as IndexKey,
          })
        );
      }

      store.clear();
      store.put(
        [...bootstrapRecords, ...Array.from(currentRemote.values())],
        "initialize"
      );

      unsubs.push(
        store.listen(
          ({ changes }: TLStoreEventInfo) => {
            if (!canWrite) {
              return;
            }
            room.batch(() => {
              Object.values(changes.added).forEach((record) => {
                records.set(
                  record.id,
                  normalizeRecord(record) as unknown as StorageRecord
                );
              });
              Object.values(changes.updated).forEach(([, record]) => {
                records.set(
                  record.id,
                  normalizeRecord(record) as unknown as StorageRecord
                );
              });
              Object.values(changes.removed).forEach((record) => {
                records.delete(record.id);
              });
            });
          },
          { source: "user", scope: "document" }
        )
      );

      unsubs.push(
        room.subscribe(
          records,
          (storageChanges) => {
            const previousRemote = remoteCacheRef.current;
            const nextRemote = new Map<string, TLRecord>();
            for (const [id, record] of records.entries()) {
              nextRemote.set(
                id,
                normalizeRecord(record as unknown as TLRecord)
              );
            }

            const toPut: TLRecord[] = [];
            const toRemove: TLRecord["id"][] = [];

            for (const update of storageChanges) {
              if (update.type !== "LiveMap") {
                continue;
              }

              for (const [id, value] of Object.entries(update.updates)) {
                if (value.type === "delete") {
                  toRemove.push(id as TLRecord["id"]);
                  continue;
                }

                const record = update.node.get(id);
                if (record) {
                  toPut.push(normalizeRecord(record as unknown as TLRecord));
                }
              }
            }

            for (const [id] of previousRemote.entries()) {
              if (!nextRemote.has(id)) {
                toRemove.push(id as TLRecord["id"]);
              }
            }

            remoteCacheRef.current = nextRemote;

            store.mergeRemoteChanges(() => {
              if (toRemove.length > 0) {
                store.remove(Array.from(new Set(toRemove)));
              }
              if (toPut.length > 0) {
                store.put(toPut);
              }
            });
          },
          { isDeep: true }
        )
      );

      const userPreferences = computed<TLUser | null>("userPreferences", () => {
        return {
          id: createUserId(id),
          color: info.color,
          name: info.name,
          imageUrl: info.avatar ?? "",
          meta: {},
          typeName: "user",
        };
      });

      const connectionIdString = String(room.getSelf()?.connectionId ?? 0);
      const presenceDerivation = createPresenceStateDerivation(
        userPreferences,
        {
          instanceId: InstancePresenceRecordType.createId(connectionIdString),
        }
      )(store);

      room.updatePresence({
        // XXX TLInstancePresence is JSON-serializable but not assignable to our
        // generic JSON object type in Liveblocks augmentation.
        presence: (presenceDerivation.get() ?? null) as unknown as Liveblocks["Presence"]["presence"],
      });

      unsubs.push(
        react("when presence changes", () => {
          const presence = presenceDerivation.get() ?? null;
          requestAnimationFrame(() => {
            room.updatePresence({
              presence: presence as unknown as Liveblocks["Presence"]["presence"],
            });
          });
        })
      );

      unsubs.push(
        room.subscribe("others", (others, event) => {
          const toRemove: TLInstancePresence["id"][] = [];
          const toPut: TLInstancePresence[] = [];

          switch (event.type) {
            case "leave": {
              if (event.user.connectionId) {
                toRemove.push(
                  InstancePresenceRecordType.createId(
                    String(event.user.connectionId)
                  )
                );
              }
              break;
            }
            case "reset": {
              others.forEach((other) => {
                toRemove.push(
                  InstancePresenceRecordType.createId(String(other.connectionId))
                );
              });
              break;
            }
            case "enter":
            case "update": {
              const remotePresence = event.user.presence?.presence;
              if (remotePresence) {
                // XXX Presence payload is JSON-typed in Liveblocks but contains
                // TLInstancePresence data from tldraw.
                toPut.push(remotePresence as unknown as TLInstancePresence);
              }
              break;
            }
          }

          store.mergeRemoteChanges(() => {
            if (toRemove.length > 0) {
              store.remove(toRemove);
            }
            if (toPut.length > 0) {
              store.put(toPut);
            }
          });
        })
      );

      if (!isDisposed) {
        setIsReady(true);
      }
    }

    void setup();

    return () => {
      isDisposed = true;
      unsubs.forEach((fn) => fn());
    };
  }, [canWrite, id, info.avatar, info.color, info.name, room, store]);

  return { store, isReady };
}
