/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { createHash } from "node:crypto";

import { Base64 } from "js-base64";
import { nanoid } from "nanoid";
import * as Y from "yjs";

import type { Guid, YDocId } from "~/decoders";
import { ROOT_YDOC_ID } from "~/decoders";
import type { IStorageDriver } from "~/interfaces";
import type { Logger } from "~/lib/Logger";

// How many updates to store before compacting
const UPDATE_COUNT_THRESHOLD = 1_000;

// How much update history to retain on top of the latest compacted snapshot.
// This is deliberately much lower than the isolate memory limit because Yjs
// updates can expand many times over while they are decoded and materialized.
const UNCOMPACTED_UPDATE_BYTES_THRESHOLD = 2 * 1024 * 1024;

// Compacted snapshots use a recognizable key so that a fresh isolate can
// distinguish the baseline snapshot from the uncompacted updates that follow
// it. The prefix only contains characters accepted by the Yjs repair routes
// and cannot collide with the legacy 21-character nanoid keys.
const COMPACTED_SNAPSHOT_KEY_PREFIX = "__liveblocks_compacted_snapshot__";

type StoredYDocState = {
  keys: string[];
  uncompactedTailBytes: number;
};

export class YjsStorage {
  private readonly driver: IStorageDriver;
  private readonly updateCountThreshold: number;
  private readonly uncompactedUpdateBytesThreshold: number;

  /**
   * The root Y.Doc instance, which may not have been hydrated from storage
   * yet. Use getRootDoc() instead, which lazily hydrates it on first access —
   * only touch this field directly when the unhydrated instance is fine
   * (e.g. identity checks, subdoc traversal).
   */
  private readonly rawRootDoc: Y.Doc = new Y.Doc();
  private readonly lastSnapshotById = new Map<YDocId, Y.Snapshot>();
  private readonly docsById: Map<YDocId, Y.Doc> = new Map();
  private readonly storedStateById: Map<YDocId, StoredYDocState> = new Map();

  constructor(
    driver: IStorageDriver,
    updateCountThreshold: number = UPDATE_COUNT_THRESHOLD,
    uncompactedUpdateBytesThreshold: number = UNCOMPACTED_UPDATE_BYTES_THRESHOLD
  ) {
    this.driver = driver;
    this.updateCountThreshold = updateCountThreshold;
    this.uncompactedUpdateBytesThreshold = uncompactedUpdateBytesThreshold;
    this.rawRootDoc.on("subdocs", ({ removed }) => {
      removed.forEach((subdoc: Y.Doc) => {
        subdoc.destroy(); // will remove listeners
      });
    });
  }

  // ------------------------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------------------------

  public getYDoc(logger: Logger, docId: YDocId): Y.Doc {
    if (docId !== ROOT_YDOC_ID) {
      // Subdocs hang off the root doc, so make sure that one is loaded first
      // (otherwise the subdoc lookup below would come up empty)
      this.getRootDoc(logger);
    }

    let loaded = this.docsById.get(docId);
    let doc =
      docId === ROOT_YDOC_ID ? this.rawRootDoc : this.findYSubdocByGuid(docId);
    if (!doc) {
      // An API call can load a subdoc without the root doc being loaded, we account for that by just instantiating a doc here.
      doc = new Y.Doc();
    }
    if (loaded === undefined) {
      loaded = this._loadYDocFromDurableStorage(doc, docId);
      this.docsById.set(docId, loaded);
    }
    return loaded;
  }

  /**
   * Returns the root Y.Doc, lazily loading it from storage first if it
   * hasn't been loaded yet during this instance's lifetime.
   */
  private getRootDoc(logger: Logger): Y.Doc {
    return this.getYDoc(logger, ROOT_YDOC_ID);
  }

  /**
   * If passed a state vector, an update with diff will be returned, if not the entire doc is returned.
   *
   * @param stateVector a base64 encoded target state vector created by running Y.encodeStateVector(Doc) on the client
   * @returns a base64 encoded array of YJS updates
   */
  public getYDocUpdate(
    logger: Logger,
    stateVector: string = "",
    guid?: Guid,
    isV2: boolean = false
  ): string | null {
    const update = this.getYDocUpdateBinary(logger, stateVector, guid, isV2);
    if (!update) return null;
    return Base64.fromUint8Array(update);
  }

  public getYDocUpdateBinary(
    logger: Logger,
    stateVector: string = "",
    guid?: Guid,
    isV2: boolean = false
  ): Uint8Array<ArrayBuffer> | null {
    const doc =
      guid !== undefined
        ? this.getYSubdoc(logger, guid)
        : this.getRootDoc(logger);
    if (!doc) {
      return null;
    }
    let encodedTargetVector;
    try {
      // if given a state vector, attempt to decode it a single diffed update
      encodedTargetVector =
        stateVector.length > 0 ? Base64.toUint8Array(stateVector) : undefined;
    } catch {
      logger.warn(
        "Could not get update from passed vector, returning all updates"
      );
    }
    if (isV2) {
      return Y.encodeStateAsUpdateV2(doc, encodedTargetVector);
    }
    return Y.encodeStateAsUpdate(doc, encodedTargetVector);
  }

  public getYStateVector(logger: Logger, guid?: Guid): string | null {
    const doc =
      guid !== undefined
        ? this.getYSubdoc(logger, guid)
        : this.getRootDoc(logger);
    if (!doc) {
      return null;
    }
    return Base64.fromUint8Array(Y.encodeStateVector(doc));
  }

  public getSnapshotHash(
    logger: Logger,
    options: { guid?: Guid; isV2?: boolean }
  ): string | null {
    const doc =
      options.guid !== undefined
        ? this.getYSubdoc(logger, options.guid)
        : this.getRootDoc(logger);
    if (!doc) {
      return null;
    }
    const snapshot = this._getOrPutLastSnapshot(doc);
    return this.calculateSnapshotHash(snapshot, { isV2: options.isV2 });
  }

  /**
   * @param update base64 encoded uint8array
   * @returns { isUpdated: boolean; snapshotHash: string }
   *   isUpdated: true if the update had an effect on the YDoc
   *   snapshotHash: the hash of the new snapshot
   */
  public addYDocUpdate(
    logger: Logger,
    update: string | Uint8Array,
    guid?: Guid,
    isV2?: boolean
  ): { isUpdated: boolean; snapshotHash: string } {
    const doc =
      guid !== undefined
        ? this.getYSubdoc(logger, guid)
        : this.getRootDoc(logger);
    if (!doc) {
      throw new Error(`YDoc with guid ${guid} not found`);
    }

    try {
      // takes a snapshot if none is stored in memory - NOTE: snapshots are a combination of statevector + deleteset, not a full doc
      const beforeSnapshot = this._getOrPutLastSnapshot(doc);
      const updateAsU8 =
        typeof update === "string" ? Base64.toUint8Array(update) : update;
      const applyUpdate = isV2 ? Y.applyUpdateV2 : Y.applyUpdate;
      applyUpdate(doc, updateAsU8, "client");
      // put the new "after update" snapshot
      const afterSnapshot = this._putLastSnapshot(doc);
      // Check the snapshot before/after to see if the update had an effect
      const updated = !Y.equalSnapshots(beforeSnapshot, afterSnapshot);
      if (updated) {
        this.handleYDocUpdate(doc, updateAsU8, isV2);
      }

      return {
        isUpdated: updated,
        snapshotHash: this.calculateSnapshotHash(afterSnapshot, { isV2 }),
      };
    } catch (e) {
      // The only reason this would happen is if a user would send bad data
      logger.warn(`Ignored bad YDoc update: ${String(e)}`);
      throw new Error(
        "Bad YDoc update. Data is corrupted, or data does not match the encoding."
      );
    }
  }

  // ------------------------------------------------------------------------------------
  // Private APIs
  // ------------------------------------------------------------------------------------

  // NOTE: We could instead store the hash of snapshot instead of the whole snapshot to optimize memory usage.
  private _getOrPutLastSnapshot(doc: Y.Doc): Y.Snapshot {
    const docId: YDocId =
      doc.guid === this.rawRootDoc.guid ? ROOT_YDOC_ID : (doc.guid as Guid);
    const snapshot = this.lastSnapshotById.get(docId);
    if (snapshot) {
      return snapshot;
    }
    return this._putLastSnapshot(doc);
  }

  // NOTE: We could instead store the hash of snapshot instead of the whole snapshot to optimize memory usage.
  private _putLastSnapshot(doc: Y.Doc): Y.Snapshot {
    const docId: YDocId =
      doc.guid === this.rawRootDoc.guid ? ROOT_YDOC_ID : (doc.guid as Guid);
    const snapshot = Y.snapshot(doc);
    this.lastSnapshotById.set(docId, snapshot);
    return snapshot;
  }

  // compact the updates into a single update and write it to the durable storage
  private _compactYJSUpdates = (
    doc: Y.Doc,
    docId: YDocId,
    storedState: StoredYDocState
  ): void => {
    const compactedUpdate = Y.encodeStateAsUpdate(doc);
    const newKey = `${COMPACTED_SNAPSHOT_KEY_PREFIX}${nanoid()}`;
    this.driver.write_y_updates(docId, newKey, compactedUpdate);
    // Todo: after we kill the kv driver, we should have an overwrite method in the driverso we don't need to delete and write
    if (storedState.keys.length > 0) {
      this.driver.delete_y_updates(docId, storedState.keys);
    }
    this.storedStateById.set(docId, {
      keys: [newKey],
      uncompactedTailBytes: 0,
    });
  };

  private _loadYDocFromDurableStorage = (doc: Y.Doc, docId: YDocId): Y.Doc => {
    const storedKeys: string[] = [];
    const updates: Uint8Array[] = [];
    let totalBytes = 0;
    let uncompactedTailBytes = 0;
    let compactedSnapshotCount = 0;
    let compactedSnapshotIndex = -1;
    for (const [key, update] of this.driver.iter_y_updates(docId)) {
      storedKeys.push(key);
      updates.push(update);
      totalBytes += update.byteLength;
      if (key.startsWith(COMPACTED_SNAPSHOT_KEY_PREFIX)) {
        compactedSnapshotCount++;
        compactedSnapshotIndex = updates.length - 1;
      } else {
        uncompactedTailBytes += update.byteLength;
      }
    }
    this.storedStateById.set(docId, {
      keys: storedKeys,
      // Without exactly one marked snapshot there is no trusted baseline.
      uncompactedTailBytes:
        compactedSnapshotCount === 1 ? uncompactedTailBytes : totalBytes,
    });

    if (compactedSnapshotCount === 1) {
      const compactedSnapshot = updates[compactedSnapshotIndex];
      if (compactedSnapshot !== undefined) {
        updates.splice(compactedSnapshotIndex, 1);
        // Keep the potentially large baseline out of the tail merge. Applying
        // the remaining updates afterwards is safe because Yjs updates are
        // commutative and idempotent.
        Y.applyUpdate(doc, compactedSnapshot);
      }
    }
    if (updates.length > 0) {
      Y.applyUpdate(doc, Y.mergeUpdates(updates));
    }
    doc.emit("load", [doc]); // sets the "isLoaded" to true on the doc

    return doc;
  };

  private findYSubdocByGuid(guid: Guid): Y.Doc | null {
    for (const subdoc of this.rawRootDoc.getSubdocs()) {
      if (subdoc.guid === guid) {
        return subdoc;
      }
    }
    return null;
  }

  private calculateSnapshotHash(
    snapshot: Y.Snapshot,
    { isV2 }: { isV2?: boolean }
  ): string {
    const encodedSnapshot = isV2
      ? Y.encodeSnapshotV2(snapshot)
      : Y.encodeSnapshot(snapshot);
    return createHash("sha256").update(encodedSnapshot).digest("base64");
  }

  // gets a subdoc, it will be loaded if not already loaded
  private getYSubdoc(logger: Logger, guid: Guid): Y.Doc | null {
    // Subdocs hang off the root doc, so make sure that one is loaded first
    this.getRootDoc(logger);

    const subdoc = this.findYSubdocByGuid(guid);
    if (!subdoc) {
      return null;
    }
    this.getYDoc(logger, guid);
    return subdoc;
  }

  // When the YJS doc changes, update it in durable storage
  private handleYDocUpdate(
    doc: Y.Doc,
    update: Uint8Array,
    isV2: boolean | undefined
  ): void {
    // Todo: in the future, we should pass this detail to the driver so it can store the version as metadata
    // this will be easy for sqlite drivers, but not for the KV driver
    const v1update = isV2 ? Y.convertUpdateFormatV2ToV1(update) : update;
    const docId: YDocId =
      doc.guid === this.rawRootDoc.guid ? ROOT_YDOC_ID : (doc.guid as Guid);

    const storedState = this.storedStateById.get(docId) ?? {
      keys: [],
      uncompactedTailBytes: 0,
    };

    // the whole concept of storing keys is not needed when we kill the kv driver, all of this stuff is trivial in sqlite
    const newKey = nanoid();
    this.driver.write_y_updates(docId, newKey, v1update);

    // Raw updates always count toward the tail. Only a snapshot produced by
    // successful compaction is a baseline, which prevents large canonical
    // documents from being compacted again on every change.
    storedState.keys.push(newKey);
    storedState.uncompactedTailBytes += v1update.byteLength;
    this.storedStateById.set(docId, storedState);

    const shouldCompact =
      storedState.uncompactedTailBytes >=
        this.uncompactedUpdateBytesThreshold ||
      storedState.keys.length >= this.updateCountThreshold;
    if (shouldCompact) {
      this._compactYJSUpdates(doc, docId, storedState);
    }
  }
}
