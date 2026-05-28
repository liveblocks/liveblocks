"use client";

import { useRoom } from "@liveblocks/react/suspense";
import type { LiveMap } from "@liveblocks/client";
import { useEffect, useRef, useState } from "react";
import {
  DocumentRecordType,
  PageRecordType,
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  type IndexKey,
  type TLAnyBindingUtilConstructor,
  type TLAnyShapeUtilConstructor,
  type TLDocument,
  type TLPageId,
  type TLRecord,
  type TLStore,
  type TLStoreEventInfo,
} from "tldraw";

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

export function useStorageStore({
  shapeUtils = [],
  bindingUtils = [],
}: UseStorageStoreOptions = {}) {
  const room = useRoom();
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
        currentRemote.set(id, record as unknown as TLRecord);
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
            room.batch(() => {
              Object.values(changes.added).forEach((record) => {
                records.set(record.id, record as unknown as StorageRecord);
              });
              Object.values(changes.updated).forEach(([, record]) => {
                records.set(record.id, record as unknown as StorageRecord);
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
              nextRemote.set(id, record as unknown as TLRecord);
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
                  toPut.push(record as unknown as TLRecord);
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

      if (!isDisposed) {
        setIsReady(true);
      }
    }

    void setup();

    return () => {
      isDisposed = true;
      unsubs.forEach((fn) => fn());
    };
  }, [room, store]);

  return { store, isReady };
}
