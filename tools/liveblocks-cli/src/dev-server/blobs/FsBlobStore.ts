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

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

import type {
  BlobBody,
  BlobMeta,
  BlobMetaInput,
  IBlobStore,
  UploadedPart,
} from "@liveblocks/server";

/** Path segment under the store root holding completed objects. */
const BLOBS_DIR = "blobs";

/** Path segment under the store root holding in-progress multipart uploads. */
const PARTIAL_DIR = "partial";

/** Suffix of the sidecar file carrying an object's content type/disposition. */
const META_SUFFIX = ".meta";

type StoredMeta = BlobMetaInput;

type MultipartMeta = BlobMetaInput & { key: string };

export type FsBlobStoreOptions = {
  /** Directory to keep blobs in. Created if it doesn't exist. */
  root: string;
  /** Origin that signed URLs should point at, e.g. "http://localhost:1153". */
  baseUrl: string;
  /** Secret used to sign download URLs. */
  secret: string;
};

/**
 * A filesystem-backed IBlobStore for the dev server.
 *
 * Two things a real object store gives away for free have to be built by hand
 * here. Object metadata (content type and disposition, which is where a
 * LiveFile's MIME type and name live) has no home on a filesystem, so it goes
 * in a sidecar next to the bytes. And there is no notion of a credentialed URL,
 * so signedGetUrl() mints an HMAC-signed link that the dev server's own
 * download route validates — see verifySignedGetUrl(), which is the half of
 * that exchange an S3-backed implementation would have no use for.
 */
export class FsBlobStore implements IBlobStore {
  readonly #root: string;
  readonly #baseUrl: string;
  readonly #secret: string;

  constructor(options: FsBlobStoreOptions) {
    this.#root = options.root;
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#secret = options.secret;

    mkdirSync(join(this.#root, BLOBS_DIR), { recursive: true });
    mkdirSync(join(this.#root, PARTIAL_DIR), { recursive: true });
  }

  /**
   * Keys are opaque and routinely contain "/" (they look like
   * "<internalRoomId>/<fileId>"), but the interface says to treat them as flat
   * names, so each one becomes a single percent-encoded filename.
   */
  #objectPath(key: string): string {
    return join(this.#root, BLOBS_DIR, asFilename(key));
  }

  #uploadDir(uploadId: string): string {
    return join(this.#root, PARTIAL_DIR, asFilename(uploadId));
  }

  async #readMeta(path: string): Promise<StoredMeta | undefined> {
    const file = Bun.file(path + META_SUFFIX);
    if (!(await file.exists())) return undefined;
    return (await file.json()) as StoredMeta;
  }

  async put(
    key: string,
    body: BlobBody,
    meta: BlobMetaInput
  ): Promise<BlobMeta> {
    const path = this.#objectPath(key);

    // Write the bytes to one side first, then publish by rename, so that a
    // half-written upload is never visible to head().
    const tmpPath = `${path}.${randomUUID()}.partial`;
    const size = await Bun.write(tmpPath, await toBytes(body));
    await Bun.write(path + META_SUFFIX, JSON.stringify(meta));
    renameSync(tmpPath, path);

    return { ...meta, size };
  }

  async head(key: string): Promise<BlobMeta | undefined> {
    const path = this.#objectPath(key);
    const file = Bun.file(path);
    if (!(await file.exists())) return undefined;

    const meta = await this.#readMeta(path);
    return {
      size: file.size,
      contentType: meta?.contentType ?? "",
      contentDisposition: meta?.contentDisposition ?? "",
    };
  }

  async get(key: string): Promise<ReadableStream<Uint8Array> | undefined> {
    const file = Bun.file(this.#objectPath(key));
    if (!(await file.exists())) return undefined;
    return file.stream();
  }

  async delete(key: string): Promise<void> {
    const path = this.#objectPath(key);
    await Bun.file(path).unlink().catch(NOOP);
    await Bun.file(path + META_SUFFIX)
      .unlink()
      .catch(NOOP);
  }

  async createMultipart(key: string, meta: BlobMetaInput): Promise<string> {
    const uploadId = randomUUID();
    mkdirSync(this.#uploadDir(uploadId), { recursive: true });

    const multipartMeta: MultipartMeta = { ...meta, key };
    await Bun.write(
      join(this.#uploadDir(uploadId), "meta"),
      JSON.stringify(multipartMeta)
    );
    return uploadId;
  }

  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: BlobBody
  ): Promise<UploadedPart> {
    await this.#requireUpload(key, uploadId);

    const bytes = await toBytes(body);
    await Bun.write(this.#partPath(uploadId, partNumber), bytes);
    return { partNumber, etag: etagOf(bytes) };
  }

  async completeMultipart(
    key: string,
    uploadId: string,
    parts: UploadedPart[]
  ): Promise<BlobMeta> {
    const meta = await this.#requireUpload(key, uploadId);

    // Only the named parts are assembled, and always in part-number order, no
    // matter what order the caller listed or uploaded them in.
    const ordered = [...parts].sort((a, b) => a.partNumber - b.partNumber);

    const chunks: Uint8Array[] = [];
    for (const part of ordered) {
      const file = Bun.file(this.#partPath(uploadId, part.partNumber));
      if (!(await file.exists())) {
        throw new Error(`No such part ${part.partNumber} in upload ${uploadId}`); // prettier-ignore
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (etagOf(bytes) !== part.etag) {
        throw new Error(`ETag mismatch for part ${part.partNumber}`);
      }
      chunks.push(bytes);
    }

    const result = await this.put(key, concat(chunks), {
      contentType: meta.contentType,
      contentDisposition: meta.contentDisposition,
    });

    await this.abortMultipart(key, uploadId);
    return result;
  }

  async abortMultipart(key: string, uploadId: string): Promise<void> {
    // Aborting an upload that isn't there is fine: the SDK aborts on failure
    // paths where it may never have been created. Aborting one belonging to a
    // different object is not — that would throw away someone else's parts.
    const meta = await this.#readUpload(uploadId);
    if (meta === undefined) {
      return;
    }
    if (meta.key !== key) {
      throw new Error(`Upload ${uploadId} does not belong to ${key}`);
    }

    rmSync(this.#uploadDir(uploadId), { recursive: true, force: true });
  }

  async signedGetUrl(key: string, ttlSeconds: number): Promise<string> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const url = new URL(`${this.#baseUrl}${DOWNLOAD_PATH}`);
    url.searchParams.set("key", key);
    url.searchParams.set("exp", String(expiresAt));
    url.searchParams.set("sig", this.#sign(key, expiresAt));
    return Promise.resolve(url.toString());
  }

  /**
   * Validate a download URL's query params and return the key it grants access
   * to, or undefined if the signature doesn't match or the link has expired.
   *
   * Not part of IBlobStore: an object store that mints real presigned URLs
   * verifies them itself, and would never be asked this.
   */
  verifySignedGetUrl(params: URLSearchParams): string | undefined {
    const key = params.get("key");
    const exp = Number(params.get("exp"));
    const sig = params.get("sig");
    if (key === null || sig === null || !Number.isFinite(exp)) return undefined;
    if (Date.now() > exp) return undefined;

    const expected = Buffer.from(this.#sign(key, exp));
    const actual = Buffer.from(sig);
    if (expected.length !== actual.length) return undefined;
    return timingSafeEqual(expected, actual) ? key : undefined;
  }

  #sign(key: string, expiresAt: number): string {
    return createHmac("sha256", this.#secret)
      .update(`${key}\n${expiresAt}`)
      .digest("hex");
  }

  #partPath(uploadId: string, partNumber: number): string {
    if (!Number.isSafeInteger(partNumber) || partNumber < 1) {
      throw new Error(`Invalid part number: ${String(partNumber)}`);
    }
    return join(this.#uploadDir(uploadId), `part-${partNumber}`);
  }

  /** Load an upload's metadata, or undefined if there is no such upload. */
  async #readUpload(uploadId: string): Promise<MultipartMeta | undefined> {
    const file = Bun.file(join(this.#uploadDir(uploadId), "meta"));
    if (!(await file.exists())) {
      return undefined;
    }
    return (await file.json()) as MultipartMeta;
  }

  /** Load an upload's metadata, throwing if it isn't an upload for `key`. */
  async #requireUpload(key: string, uploadId: string): Promise<MultipartMeta> {
    const meta = await this.#readUpload(uploadId);
    if (meta === undefined) {
      throw new Error(`No such multipart upload ${uploadId}`);
    }
    if (meta.key !== key) {
      throw new Error(`Upload ${uploadId} does not belong to ${key}`);
    }
    return meta;
  }
}

/** Path the dev server serves signed downloads from. */
export const DOWNLOAD_PATH = "/blob";

const NOOP = () => {};

/**
 * Turn an opaque identifier into exactly one filename.
 *
 * Percent-encoding gets almost all of the way there — "/" and "\" both come
 * out escaped, so no input can name a nested path. What it does NOT escape is
 * ".", so `encodeURIComponent("..")` is still ".." and joining that onto a
 * directory silently walks up out of it. The three inputs that survive
 * encoding as path syntax are refused here, which keeps the promise that one
 * identifier is one file inside the store.
 */
function asFilename(value: string): string {
  const encoded = encodeURIComponent(value);
  if (encoded === "" || encoded === "." || encoded === "..") {
    throw new Error(`Unsafe blob store name: ${JSON.stringify(value)}`);
  }
  return encoded;
}

async function toBytes(body: BlobBody): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  return new Uint8Array(await new Response(body).arrayBuffer());
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/** Any stable content hash works; S3 uses MD5, we don't need to match it. */
function etagOf(bytes: Uint8Array): string {
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
}
