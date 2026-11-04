"use client";

import { LiveMap } from "@liveblocks/client";
import { shallow } from "@liveblocks/react";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import {
  computed,
  createPresenceStateDerivation,
  createTLStore,
  createUserId,
  defaultBindingUtils,
  defaultShapeUtils,
  DocumentRecordType,
  type IndexKey,
  InstancePresenceRecordType,
  PageRecordType,
  react,
  type TLAnyShapeUtilConstructor,
  type TLDocument,
  type TLInstancePresence,
  type TLPageId,
  type TLRecord,
  type TLStoreEventInfo,
  type TLStoreWithStatus,
  UserRecordType,
} from "tldraw";
import type { LiveblocksAssetStore } from "./liveblocks-asset-store";
import {
  createLiveblocksRecord,
  getLiveblocksJsonObject,
  getTldrawRecord,
  isLiveblocksRecord,
  reconcileLiveblocksRecord,
} from "./liveblocks-tldraw-storage";

// A tldraw store synced with Liveblocks Storage. Each whiteboard / PDF
// document has its own record map under `root.whiteboards[docId]`, and
// cursors are shared through Presence, scoped to the document being viewed.
export function useStorageStore({
  docId,
  assets,
  shapeUtils = [],
}: {
  docId: string;
  assets: LiveblocksAssetStore;
  shapeUtils?: TLAnyShapeUtilConstructor[];
}) {
  const room = useRoom();
  const self = useSelf(
    (me) => ({
      id: me.id,
      name: me.info.name,
      color: me.info.color,
      avatar: me.info.avatar,
    }),
    shallow
  );

  const [store] = useState(() =>
    createTLStore({
      assets,
      shapeUtils: [...defaultShapeUtils, ...shapeUtils],
      bindingUtils: defaultBindingUtils,
    })
  );

  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
    status: "loading",
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    let disposed = false;
    setStoreWithStatus({ status: "loading" });

    async function setup() {
      const { root } = await room.getStorage();
      if (disposed) return;

      let liveRecords = root.get("whiteboards").get(docId);
      if (!liveRecords) {
        liveRecords = new LiveMap();
        root.get("whiteboards").set(docId, liveRecords);
      }
      const records = liveRecords;

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
        for (const [id, liveRecord] of records.entries()) {
          if (isLiveblocksRecord(liveRecord)) continue;
          const record = getTldrawRecord(liveRecord);
          if (record) {
            records.set(id, createLiveblocksRecord(record));
          }
        }
        for (const record of defaultRecords) {
          if (!records.has(record.id)) {
            records.set(record.id, createLiveblocksRecord(record));
          }
        }
      });

      function getRecordsFromStorage() {
        const result: TLRecord[] = [];
        for (const liveRecord of records.values()) {
          const record = getTldrawRecord(liveRecord);
          if (record) result.push(record);
        }
        return result;
      }

      // Initialize tldraw with the records from Storage. Only the document
      // records are swapped: `store.clear()` would also drop the session
      // records (instance, camera…) that a mounted editor reads while this
      // effect re-runs, and crash it.
      function replaceDocumentRecords(toPut: TLRecord[]) {
        const ids = new Set(toPut.map((record) => record.id));
        const toRemove = store
          .allRecords()
          .filter(
            (record) =>
              store.scopedTypes.document.has(record.typeName) &&
              !ids.has(record.id)
          )
          .map((record) => record.id);

        store.mergeRemoteChanges(() => {
          if (toRemove.length) store.remove(toRemove);
          if (toPut.length) store.put(toPut);
        });
      }
      replaceDocumentRecords(getRecordsFromStorage());

      // tldraw → Storage
      unsubs.push(
        store.listen(
          ({ changes }: TLStoreEventInfo) => {
            room.batch(() => {
              for (const record of Object.values(changes.added)) {
                records.set(record.id, createLiveblocksRecord(record));
              }
              for (const [, record] of Object.values(changes.updated)) {
                const liveRecord = records.get(record.id);
                if (liveRecord && isLiveblocksRecord(liveRecord)) {
                  reconcileLiveblocksRecord(liveRecord, record);
                } else {
                  records.set(record.id, createLiveblocksRecord(record));
                }
              }
              for (const record of Object.values(changes.removed)) {
                records.delete(record.id);
              }
            });
          },
          { source: "user", scope: "document" }
        )
      );

      // Storage → tldraw
      unsubs.push(
        room.subscribe(
          records,
          () => replaceDocumentRecords(getRecordsFromStorage()),
          { isDeep: true }
        )
      );

      // Own cursor/selection → Presence
      const user = computed("user", () =>
        UserRecordType.create({
          id: createUserId(self.id),
          name: self.name,
          color: self.color,
          imageUrl: self.avatar,
          meta: {},
        })
      );
      const connectionId = String(room.getSelf()?.connectionId ?? 0);
      const presenceDerivation = createPresenceStateDerivation(user, {
        instanceId: InstancePresenceRecordType.createId(connectionId),
      })(store);

      function publishPresence() {
        const presenceRecord = presenceDerivation.get();
        room.updatePresence({
          tldraw: presenceRecord
            ? getLiveblocksJsonObject(presenceRecord)
            : null,
        });
      }
      publishPresence();
      unsubs.push(
        react("when presence changes", () => {
          presenceDerivation.get();
          requestAnimationFrame(publishPresence);
        })
      );

      // Others' Presence → tldraw, only for people on this document. This
      // includes the AI assistant, whose presence is set from the server.
      function syncOthers() {
        const others = room.getOthers();
        const toPut: TLInstancePresence[] = [];
        const keep = new Set<string>();
        for (const other of others) {
          const id = InstancePresenceRecordType.createId(
            String(other.connectionId)
          );
          if (other.presence.docId !== docId) continue;
          const record = getTldrawRecord(other.presence.tldraw);
          if (record?.typeName === "instance_presence") {
            // Key the record by connection, whatever id the sender used
            toPut.push({ ...record, id });
            keep.add(id);
          }
        }
        const toRemove = store
          .allRecords()
          .filter(
            (record) =>
              record.typeName === "instance_presence" &&
              !keep.has(record.id) &&
              record.id !== presenceDerivation.get()?.id
          )
          .map((record) => record.id);

        store.mergeRemoteChanges(() => {
          if (toRemove.length) store.remove(toRemove);
          if (toPut.length) store.put(toPut);
        });
      }
      syncOthers();
      unsubs.push(room.subscribe("others", syncOthers));

      setStoreWithStatus({
        store,
        status: "synced-remote",
        connectionStatus: "online",
      });
    }

    void setup();

    return () => {
      disposed = true;
      for (const unsub of unsubs) unsub();
      unsubs.length = 0;
      room.updatePresence({ tldraw: null });
    };
  }, [room, store, docId, self]);

  return storeWithStatus;
}
