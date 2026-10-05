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

import { CrdtType } from "@liveblocks/core";
import type { BlobMeta, UploadedPart } from "@liveblocks/server";
import { abort } from "@liveblocks/zenrouter";
import mime from "mime";

import { getBlobStore } from "~/dev-server/blobs/store";
import * as Rooms from "~/dev-server/db/rooms";

export const SIGNED_URL_EXPIRES_IN_SECONDS = 3600;

/**
 * Per-file size cap. Production reads `paywall.fileMaxSizeInBytes` from the
 * project's features config; the dev server has no such notion, so it's
 * effectively unlimited. The enforcement points below are kept in place so
 * that introducing a real limit is a config change rather than a rewrite.
 */
const FILE_MAX_SIZE_IN_BYTES = Number.POSITIVE_INFINITY;

export type StorageFileData = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
};

export type StorageFileWithSignedUrl = StorageFileData & {
  url: string;
  expiresAt: string;
};

/**
 * Blobs are keyed by internal room ID, so renaming a room doesn't strand its
 * files and two rooms can't collide on a file ID.
 */
export function storageFileObjectKey(
  internalRoomId: string,
  fileId: string
): string {
  return `${internalRoomId}/${fileId}`;
}

/** Resolve a room's internal ID, 404ing if the room doesn't exist. */
export function requireInternalRoomId(roomId: string): string {
  const record = Rooms.getRoom(roomId);
  if (!record) {
    abort(404);
  }
  return record.internalId;
}

export function signedUrlExpiresAt(): string {
  return new Date(
    Date.now() + SIGNED_URL_EXPIRES_IN_SECONDS * 1000
  ).toISOString();
}

/**
 * Upload a whole file in one request.
 *
 * Re-uploading the same file ID is tolerated rather than rejected, because the
 * SDK retries uploads: if the object is already there, the request body is
 * drained and the existing metadata returned. It's only a conflict if the
 * caller is describing a *different* file under an ID that's already taken.
 */
export async function uploadStorageFile(
  internalRoomId: string,
  fileId: string,
  name: string,
  body: ReadableStream<Uint8Array>,
  fileSize?: number
): Promise<StorageFileData> {
  const store = getBlobStore();
  const key = storageFileObjectKey(internalRoomId, fileId);

  const existing = await store.head(key);
  if (existing) {
    await consume(body);

    const existingData = storageFileDataFrom(fileId, existing);
    if (
      existingData.name !== name ||
      (fileSize !== undefined && existingData.size !== fileSize)
    ) {
      abort(409);
    }
    return existingData;
  }

  // Pre-flight on the advisory size the client claims, so an over-limit upload
  // can be refused before its bytes are streamed anywhere.
  if (fileSize !== undefined && fileSize > FILE_MAX_SIZE_IN_BYTES) {
    await consume(body);
    abort(413);
  }

  const mimeType = getMimeType(name);
  const written = await store.put(key, body, {
    contentType: mimeType,
    contentDisposition: createContentDisposition(name),
  });

  // ...and again on the real size, which is the only one that counts.
  if (written.size > FILE_MAX_SIZE_IN_BYTES) {
    await store.delete(key);
    abort(413);
  }

  return { id: fileId, name, size: written.size, mimeType };
}

export async function createStorageFileMultipartUpload(
  internalRoomId: string,
  fileId: string,
  name: string,
  fileSize?: number
): Promise<{ fileId: string; uploadId: string }> {
  if (fileSize !== undefined && fileSize > FILE_MAX_SIZE_IN_BYTES) {
    abort(413);
  }

  const store = getBlobStore();
  const key = storageFileObjectKey(internalRoomId, fileId);

  if (await store.head(key)) {
    abort(409);
  }

  const uploadId = await store.createMultipart(key, {
    contentType: getMimeType(name),
    contentDisposition: createContentDisposition(name),
  });
  return { fileId, uploadId };
}

export async function uploadStorageFileMultipartPart(
  internalRoomId: string,
  fileId: string,
  uploadId: string,
  partNumber: number,
  body: ReadableStream<Uint8Array>
): Promise<UploadedPart> {
  return await getBlobStore().uploadPart(
    storageFileObjectKey(internalRoomId, fileId),
    uploadId,
    partNumber,
    body
  );
}

/**
 * Assemble a multipart upload. Like the single-shot path, an already-present
 * object short-circuits, so that a retried completion is not an error.
 */
export async function completeStorageFileMultipartUpload(
  internalRoomId: string,
  fileId: string,
  uploadId: string,
  parts: UploadedPart[]
): Promise<StorageFileData> {
  const store = getBlobStore();
  const key = storageFileObjectKey(internalRoomId, fileId);

  const existing = await store.head(key);
  if (existing) {
    return storageFileDataFrom(fileId, existing);
  }

  const completed = await store.completeMultipart(key, uploadId, parts);
  if (completed.size > FILE_MAX_SIZE_IN_BYTES) {
    await store.delete(key);
    abort(413);
  }

  const uploaded = await store.head(key);
  if (!uploaded) {
    abort(404);
  }
  return storageFileDataFrom(fileId, uploaded);
}

export async function abortStorageFileMultipartUpload(
  internalRoomId: string,
  fileId: string,
  uploadId: string
): Promise<void> {
  await getBlobStore().abortMultipart(
    storageFileObjectKey(internalRoomId, fileId),
    uploadId
  );
}

export async function getStorageFileWithSignedUrl(
  internalRoomId: string,
  fileId: string
): Promise<StorageFileWithSignedUrl | null> {
  const store = getBlobStore();
  const key = storageFileObjectKey(internalRoomId, fileId);

  const meta = await store.head(key);
  if (!meta) {
    return null;
  }

  return {
    ...storageFileDataFrom(fileId, meta),
    url: await store.signedGetUrl(key, SIGNED_URL_EXPIRES_IN_SECONDS),
    expiresAt: signedUrlExpiresAt(),
  };
}

/**
 * Resolve a batch of file IDs to download URLs.
 *
 * The three outcomes are distinguishable on purpose, and the client acts on
 * them differently:
 *   - a URL:  referenced in Storage, and the bytes are there
 *   - `false`: uploaded, but nothing in Storage points at it yet — the client
 *              retries, since this usually means an op is still in flight
 *   - `null`:  nothing we know about, and retrying won't help
 */
export async function getStorageFileSignedUrls(
  internalRoomId: string,
  fileIds: string[],
  referencedFileIds: ReadonlySet<string>,
  uploadedFileIds: ReadonlySet<string>
): Promise<{ urls: (string | false | null)[]; expiresAt: string }> {
  const store = getBlobStore();
  const expiresAt = signedUrlExpiresAt();

  const resolved = new Map<string, string | false | null>();
  for (const fileId of new Set(fileIds)) {
    if (!referencedFileIds.has(fileId)) {
      resolved.set(fileId, uploadedFileIds.has(fileId) ? false : null);
      continue;
    }

    const key = storageFileObjectKey(internalRoomId, fileId);
    resolved.set(
      fileId,
      (await store.head(key))
        ? await store.signedGetUrl(key, SIGNED_URL_EXPIRES_IN_SECONDS)
        : null
    );
  }

  return { urls: fileIds.map((id) => resolved.get(id) ?? null), expiresAt };
}

/**
 * Which of `fileIds` are referenced by a LiveFile node, and which have been
 * uploaded. Production answers this inside the Durable Object with two SQL
 * queries; here both live in the same process.
 */
export function partitionStorageFileIds(
  roomId: string,
  fileIds: string[]
): { referenced: Set<string>; uploaded: Set<string> } {
  const room = Rooms.getRoomInstance(roomId);
  const wanted = new Set(fileIds);

  const referenced = new Set<string>();
  for (const [, node] of room.driver.iter_nodes()) {
    if (node.type === CrdtType.FILE && wanted.has(node.data.id)) {
      referenced.add(node.data.id);
    }
  }

  const uploaded = new Set<string>();
  for (const fileId of wanted) {
    if (room.driver.get_livefile_upload_size(fileId) !== undefined) {
      uploaded.add(fileId);
    }
  }

  return { referenced, uploaded };
}

/** Record that a file's bytes have landed, so it may be referenced. */
export function recordLivefileUpload(
  roomId: string,
  file: StorageFileData
): void {
  Rooms.getRoomInstance(roomId).driver.put_livefile_upload(file.id, file.size);
}

function storageFileDataFrom(fileId: string, meta: BlobMeta): StorageFileData {
  return {
    id: fileId,
    name: filenameFromContentDisposition(meta.contentDisposition),
    size: meta.size,
    mimeType: meta.contentType,
  };
}

async function consume(body: ReadableStream<Uint8Array>): Promise<void> {
  await new Response(body).arrayBuffer();
}

function getMimeType(name: string): string {
  return mime.getType(name) ?? "";
}

export function createContentDisposition(
  fileName: string,
  type: "inline" | "attachment" = "inline"
): string {
  const escaped = fileName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `${type}; filename="${escaped}"`;
}

/** Inverse of createContentDisposition(), including its backslash escaping. */
function filenameFromContentDisposition(contentDisposition: string): string {
  const prefix = 'filename="';
  const start = contentDisposition.indexOf(prefix);
  if (start === -1) {
    return "";
  }

  let fileName = "";
  for (let i = start + prefix.length; i < contentDisposition.length; i++) {
    const char = contentDisposition[i];
    if (char === '"') {
      return fileName;
    }

    if (char === "\\" && i + 1 < contentDisposition.length) {
      fileName += contentDisposition[i + 1];
      i++;
      continue;
    }

    fileName += char;
  }

  return "";
}
