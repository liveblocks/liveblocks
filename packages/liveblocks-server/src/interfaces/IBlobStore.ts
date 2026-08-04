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

/** Bytes accepted by the store. Uploads stream; tests usually pass a buffer. */
export type BlobBody = ReadableStream<Uint8Array> | Uint8Array;

/**
 * Everything the store knows about an object.
 *
 * There is deliberately no separate metadata record: a LiveFile's name and
 * MIME type round-trip through `contentDisposition` and `contentType` on the
 * object itself, exactly as they do in S3/R2, and its size is a property of the
 * stored bytes.
 */
export type BlobMeta = {
  size: number;
  contentType: string;
  contentDisposition: string;
};

/** Metadata supplied at write time. Size isn't known until the bytes land. */
export type BlobMetaInput = Omit<BlobMeta, "size">;

export type UploadedPart = {
  partNumber: number;
  etag: string;
};

/**
 * Blob storage for bytes that live outside the CRDT tree.
 *
 * Requirements for implementors:
 * - Writes are immediately visible to head()/get().
 * - put() and completeMultipart() report the size of the bytes actually
 *   stored, never a caller-supplied figure.
 */
export interface IBlobStore {
  /**
   * Store `body` under `key`, replacing anything already there, and return the
   * metadata of what was written — including the observed size.
   */
  put(key: string, body: BlobBody, meta: BlobMetaInput): Promise<BlobMeta>;

  /**
   * Return the metadata for `key`, or undefined if no such object exists.
   * Callers rely on this to distinguish "uploaded" from "never uploaded", so
   * implementations must not report partially-written objects.
   */
  head(key: string): Promise<BlobMeta | undefined>;

  /** Stream the bytes stored at `key`, or undefined if no such object exists. */
  get(key: string): Promise<ReadableStream<Uint8Array> | undefined>;

  /** Delete `key`. No-op if it doesn't exist. */
  delete(key: string): Promise<void>;

  /**
   * Begin a multipart upload for `key` and return its upload ID. The object at
   * `key` is not touched until completeMultipart() succeeds.
   */
  createMultipart(key: string, meta: BlobMetaInput): Promise<string>;

  /**
   * Store one part. Parts may arrive in any order and may be re-uploaded; the
   * last write for a given part number wins. The returned ETag identifies the
   * part's contents.
   */
  uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: BlobBody
  ): Promise<UploadedPart>;

  /**
   * Assemble the named parts, in ascending part-number order, into the object
   * at `key`, and discard the upload. Parts not named here are dropped, so the
   * resulting object may be smaller than everything uploaded.
   */
  completeMultipart(
    key: string,
    uploadId: string,
    parts: UploadedPart[]
  ): Promise<BlobMeta>;

  /** Discard an in-progress multipart upload and its parts. */
  abortMultipart(key: string, uploadId: string): Promise<void>;

  /**
   * Return a URL that grants read access to `key` for roughly `ttlSeconds`,
   * with no further credentials. The SDK hands this straight to the browser,
   * which fetches it without an Authorization header, so whatever authority it
   * carries has to be inside the URL.
   *
   * The value is opaque to callers: nothing may assume S3 URL shape.
   */
  signedGetUrl(key: string, ttlSeconds: number): Promise<string>;
}
