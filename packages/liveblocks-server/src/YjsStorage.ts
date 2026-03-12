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

import { Base64 } from "js-base64";
import { nanoid } from "nanoid";
import * as Y from "yjs";

import type { Guid, YDocId } from "~/decoders";
import { ROOT_YDOC_ID } from "~/decoders";
import type { IStorageDriver } from "~/interfaces";
import type { Logger } from "~/lib/Logger";

// How many updates to store before compacting
const UPDATE_COUNT_THRESHOLD = 1_000;

export class YjsStorage {
  private readonly driver: IStorageDriver;
  private readonly updateCountThreshold: number;

  private readonly doc: Y.Doc = new Y.Doc(); // the root document
  private readonly lastSnapshotById = new Map<YDocId, Y.Snapshot>();
  private readonly initPromisesById: Map<YDocId, Promise<Y.Doc>> = new Map();
  private readonly storedKeysById: Map<YDocId, string[]> = new Map();

  constructor(
    driver: IStorageDriver,
    updateCountThreshold: number = UPDATE_COUNT_THRESHOLD
  ) {
    this.driver = driver;
    this.updateCountThreshold = updateCountThreshold;
    this.doc.on("subdocs", ({ removed }) => {
      removed.forEach((subdoc: Y.Doc) => {
        subdoc.destroy(); // will remove listeners
      });
    });
  }

  // ------------------------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------------------------

  public async getYDoc(docId: YDocId): Promise<Y.Doc> {
    const doc = await this.loadDocByIdIfNotAlreadyLoaded(docId);
    return doc;
  }

  /**
   * If passed a state vector, an update with diff will be returned, if not the entire doc is returned.
   *
   * @param stateVector a base64 encoded target state vector created by running Y.encodeStateVector(Doc) on the client
   * @returns a base64 encoded array of YJS updates
   */
  public async getYDocUpdate(
    logger: Logger,
    stateVector: string = "",
    guid?: Guid,
    isV2: boolean = false
  ): Promise<string | null> {
    const update = await this.getYDocUpdateBinary(
      logger,
      stateVector,
      guid,
      isV2
    );
    if (!update) return null;
    return Base64.fromUint8Array(update);
  }

  public async getYDocUpdateBinary(
    logger: Logger,
    stateVector: string = "",
    guid?: Guid,
    isV2: boolean = false
  ): Promise<Uint8Array | null> {
    const doc = guid !== undefined ? await this.getYSubdoc(guid) : this.doc;
    if (!doc) {
      return null;
    }
    let encodedTargetVector;
    try {
      // if given a state vector, attempt to decode it a single diffed update
      encodedTargetVector =
        stateVector.length > 0 ? Base64.toUint8Array(stateVector) : undefined;
    } catch (e) {
      logger.warn(
        "Could not get update from passed vector, returning all updates"
      );
    }
    if (isV2) {
      return Y.encodeStateAsUpdateV2(doc, encodedTargetVector);
    }
    return Y.encodeStateAsUpdate(doc, encodedTargetVector);
  }

  public async getYStateVector(guid?: Guid): Promise<string | null> {
    const doc = guid !== undefined ? await this.getYSubdoc(guid) : this.doc;
    if (!doc) {
      return null;
    }
    return Base64.fromUint8Array(Y.encodeStateVector(doc));
  }

  public async getSnapshotHash(options: {
    guid?: Guid;
    isV2?: boolean;
  }): Promise<string | null> {
    const doc =
      options.guid !== undefined
        ? await this.getYSubdoc(options.guid)
        : this.doc;
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
  public async addYDocUpdate(
    logger: Logger,
    update: string | Uint8Array,
    guid?: Guid,
    isV2?: boolean
  ): Promise<{ isUpdated: boolean; snapshotHash: string }> {
    const doc = guid !== undefined ? await this.getYSubdoc(guid) : this.doc;
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
        await this.handleYDocUpdate(doc, updateAsU8, isV2);
      }

      return {
        isUpdated: updated,
        snapshotHash: await this.calculateSnapshotHash(afterSnapshot, { isV2 }),
      };
    } catch (e) {
      // The only reason this would happen is if a user would send bad data
      logger.warn(`Ignored bad YDoc update: ${String(e)}`);
      throw new Error(
        "Bad YDoc update. Data is corrupted, or data does not match the encoding."
      );
    }
  }

  public loadDocByIdIfNotAlreadyLoaded(docId: YDocId): Promise<Y.Doc> {
    let loaded$ = this.initPromisesById.get(docId);
    let doc = docId === ROOT_YDOC_ID ? this.doc : this.findYSubdocByGuid(docId);
    if (!doc) {
      // An API call can load a subdoc without the root doc (this._doc) being loaded, we account for that by just instantiating a doc here.
      doc = new Y.Doc();
    }
    if (loaded$ === undefined) {
      loaded$ = this._loadYDocFromDurableStorage(doc, docId);
      this.initPromisesById.set(docId, loaded$);
    }
    return loaded$;
  }

  public async load(_logger: Logger): Promise<void> {
    await this.loadDocByIdIfNotAlreadyLoaded(ROOT_YDOC_ID);
  }

  /**
   * Unloads the Yjs documents from memory.
   */
  public unload(): void {
    // YYY Implement this later!
    // YYY We're currently never unloading data read into memory, but let's
    // sync this with the .unload() method from Storage, so there will not be
    // any surprises here later!
    //
    // this.doc = new Y.Doc();
    // this.initPromisesById.clear();
    // this.lastSnapshotById.clear();
  }

  // ------------------------------------------------------------------------------------
  // Private APIs
  // ------------------------------------------------------------------------------------

  // NOTE: We could instead store the hash of snapshot instead of the whole snapshot to optimize memory usage.
  private _getOrPutLastSnapshot(doc: Y.Doc): Y.Snapshot {
    const docId: YDocId =
      doc.guid === this.doc.guid ? ROOT_YDOC_ID : (doc.guid as Guid);
    const snapshot = this.lastSnapshotById.get(docId);
    if (snapshot) {
      return snapshot;
    }
    return this._putLastSnapshot(doc);
  }

  // NOTE: We could instead store the hash of snapshot instead of the whole snapshot to optimize memory usage.
  private _putLastSnapshot(doc: Y.Doc): Y.Snapshot {
    const docId: YDocId =
      doc.guid === this.doc.guid ? ROOT_YDOC_ID : (doc.guid as Guid);
    const snapshot = Y.snapshot(doc);
    this.lastSnapshotById.set(docId, snapshot);
    return snapshot;
  }

  // compact the updates into a single update and write it to the durable storage
  private _compactYJSUpdates = async (
    doc: Y.Doc,
    docId: YDocId,
    storedKeys: string[]
  ): Promise<void> => {
    const compactedUpdate = Y.encodeStateAsUpdate(doc);
    const newKey = nanoid();
    await this.driver.write_y_updates(docId, newKey, compactedUpdate);
    // Todo: after we kill the kv driver, we should have an overwrite method in the driverso we don't need to delete and write
    await this.driver.delete_y_updates(docId, storedKeys);
    this.storedKeysById.set(docId, [newKey]);
  };

  private _loadYDocFromDurableStorage = async (
    doc: Y.Doc,
    docId: YDocId
  ): Promise<Y.Doc> => {
    const storedKeys: string[] = [];
    for (const [key, update] of await this.driver.iter_y_updates(docId)) {
      Y.applyUpdate(doc, update);
      storedKeys.push(key);
    }
    // after compaction, there will only be one unique key.
    if (this.shouldCompact(storedKeys)) {
      await this._compactYJSUpdates(doc, docId, storedKeys);
    } else {
      this.storedKeysById.set(docId, storedKeys);
    }
    doc.emit("load", [doc]); // sets the "isLoaded" to true on the doc

    return doc;
  };

  private findYSubdocByGuid(guid: Guid): Y.Doc | null {
    for (const subdoc of this.doc.getSubdocs()) {
      if (subdoc.guid === guid) {
        return subdoc;
      }
    }
    return null;
  }

  private async calculateSnapshotHash(
    snapshot: Y.Snapshot,
    { isV2 }: { isV2?: boolean }
  ): Promise<string> {
    const encodedSnapshot = isV2
      ? Y.encodeSnapshotV2(snapshot)
      : Y.encodeSnapshot(snapshot);
    return Base64.fromUint8Array(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new Uint8Array(encodedSnapshot))
      )
    );
  }

  // gets a subdoc, it will be loaded if not already loaded
  private async getYSubdoc(guid: Guid): Promise<Y.Doc | null> {
    const subdoc = this.findYSubdocByGuid(guid);
    if (!subdoc) {
      return null;
    }
    await this.loadDocByIdIfNotAlreadyLoaded(guid);
    return subdoc;
  }

  // When the YJS doc changes, update it in durable storage
  private async handleYDocUpdate(
    doc: Y.Doc,
    update: Uint8Array,
    isV2: boolean | undefined
  ): Promise<void> {
    // Todo: in the future, we should pass this detail to the driver so it can store the version as metadata
    // this will be easy for sqlite drivers, but not for the KV driver
    const v1update = isV2 ? Y.convertUpdateFormatV2ToV1(update) : update;
    const docId: YDocId =
      doc.guid === this.doc.guid ? ROOT_YDOC_ID : (doc.guid as Guid);

    const storedKeys = this.storedKeysById.get(docId);

    // Every UPDATE_COUNT_THRESHOLD updates, we compact the updates
    if (this.shouldCompact(storedKeys)) {
      await this._compactYJSUpdates(doc, docId, storedKeys || []);
      return;
    }

    // the whole concept of storing keys is not needed when we kill the kv driver, all of this stuff is trivial in sqlite
    const newKey = nanoid();
    await this.driver.write_y_updates(docId, newKey, v1update);

    // update the stored keys, which we'll need for compaction.
    if (!storedKeys) {
      this.storedKeysById.set(docId, [newKey]);
    } else {
      storedKeys.push(newKey);
    }
  }

  private shouldCompact(storedKeys: string[] | undefined): boolean {
    if (!storedKeys) {
      return false;
    }
    return storedKeys.length >= this.updateCountThreshold;
  }
}
