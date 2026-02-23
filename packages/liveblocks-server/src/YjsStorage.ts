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

import { DefaultMap } from "@liveblocks/core";
import { Base64 } from "js-base64";
import { nanoid } from "nanoid";
import * as Y from "yjs";

import type { Guid, YDocId } from "~/decoders";
import { ROOT_YDOC_ID } from "~/decoders";
import type { IStorageDriver } from "~/interfaces";
import type { Logger } from "~/lib/Logger";

// How big an update can be until we compress all individual updates into
// a single vector and persist that instead (i.e. when we trigger "garbage
// collection")
const MAX_Y_UPDATE_SIZE = 100_000;

type YUpdateInfo = {
  currentKey: string;
  lastVector: Uint8Array | undefined;
};

export class YjsStorage {
  private readonly driver: IStorageDriver;

  private readonly doc: Y.Doc = new Y.Doc(); // the root document
  private readonly lastUpdatesById = new Map<YDocId, YUpdateInfo>();
  private readonly lastSnapshotById = new Map<YDocId, Y.Snapshot>();
  // Keeps track of which keys are loaded, so we can clean them up without calling `.list()`
  private readonly keysById = new DefaultMap<YDocId, Set<string>>(
    () => new Set()
  );
  private readonly initPromisesById: Map<YDocId, Promise<Y.Doc>> = new Map();

  constructor(driver: IStorageDriver) {
    this.driver = driver;
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
   * @returns
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
        await this.handleYDocUpdate(doc);
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
    // this.lastUpdatesById.clear();
    // this.keysById.clear();
    // this.initPromisesById.clear();
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
  /**
   * Given a record of updates, merge them and compress if savings are significant
   */
  private _loadAndCompressYJSUpdates = async (
    docUpdates: Record<string, Uint8Array>,
    doc: Y.Doc,
    docId: YDocId
  ): Promise<void> => {
    // the percent we need to save to trigger re-writing storage, ie. only rewrite storage if we save more than 20%
    const SAVINGS_THRESHOLD = 0.2;
    // get all updates from disk
    const updates = Object.values(docUpdates);
    // uint8arrays size on disk is equal to their length, combine them to see how much we're using
    const sizeOnDisk = updates.reduce((acc, update) => {
      return acc + update.length;
    }, 0);
    if (updates.length > 0) {
      const docKeys = Object.keys(docUpdates);
      // keep track of keys in use
      this.keysById.set(docId, new Set(docKeys));

      const mergedUpdate = Y.mergeUpdates(updates);
      // Garbage collection won't happen unless we actually apply the update
      Y.applyUpdate(doc, mergedUpdate);

      // get the update so we can check out how big it is
      const garbageCollectedUpdate = Y.encodeStateAsUpdate(doc);

      if (
        garbageCollectedUpdate.length <
        sizeOnDisk * (1 - SAVINGS_THRESHOLD)
      ) {
        const newKey = nanoid();
        await this.driver.write_y_updates(
          docId,
          newKey,
          garbageCollectedUpdate
        );
        // delete all old keys, we're going to write new merged updates
        await this.driver.delete_y_updates(docId, docKeys);
        this.keysById.set(docId, new Set([newKey]));
      }
    }
  };

  private _loadYDocFromDurableStorage = async (
    doc: Y.Doc,
    docId: YDocId
  ): Promise<Y.Doc> => {
    const docUpdates = Object.fromEntries(
      await this.driver.iter_y_updates(docId)
    );
    await this._loadAndCompressYJSUpdates(docUpdates, doc, docId);
    // store the vector of the last update
    this.lastUpdatesById.set(docId, {
      currentKey: nanoid(),
      lastVector: Y.encodeStateVector(doc),
    });
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
  private async handleYDocUpdate(doc: Y.Doc): Promise<void> {
    const docId: YDocId =
      doc.guid === this.doc.guid ? ROOT_YDOC_ID : (doc.guid as Guid);
    const docUpdateInfo = this.lastUpdatesById.get(docId);
    // get the update since last vector
    const updateSinceLastVector = Y.encodeStateAsUpdate(
      doc,
      docUpdateInfo?.lastVector
    );
    // this should happen before the await on putYDoc to avoid race conditions
    // but we need the current key before, so store it here
    const storageKey = docUpdateInfo?.currentKey ?? nanoid();
    if (updateSinceLastVector.length > MAX_Y_UPDATE_SIZE) {
      // compress update, not using the vector, we want to write the whole doc
      const newKey = nanoid();
      await this.driver.write_y_updates(
        docId,
        newKey,
        Y.encodeStateAsUpdate(doc)
      );
      // delete all old keys on disk
      await this.driver.delete_y_updates(
        docId,
        Array.from(this.keysById.getOrCreate(docId))
      );
      // update the keys we have stored
      this.keysById.set(docId, new Set([newKey]));
      // future updates will write from this vector and to this key
      this.lastUpdatesById.set(docId, {
        currentKey: nanoid(), // start writing to a new key
        lastVector: Y.encodeStateVector(doc),
      });
    } else {
      // in this case, the update is small enough, just overwrite it
      await this.driver.write_y_updates(
        docId,
        storageKey,
        updateSinceLastVector
      );
      const keys = [storageKey];
      // keep track of keys used
      const currentKeys = this.keysById.getOrCreate(docId);
      for (const key of keys) {
        currentKeys.add(key);
      }
    }
  }
}
