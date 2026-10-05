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

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { FsBlobStore } from "~/dev-server/blobs/FsBlobStore";

// bun:test's expect().rejects is awaitable, but not typed as a Thenable, so
// the rule misfires here. Same disable as in _generateFullTestSuite.
/* eslint-disable @typescript-eslint/await-thenable */

const BASE_URL = "http://localhost:1153";
const SECRET = "test-secret";

const TEXT = { contentType: "text/plain", contentDisposition: 'inline; filename="hello.txt"' }; // prettier-ignore

/** A store in a fresh temp dir, cleaned up when the test ends. */
function makeStore(): FsBlobStore {
  const root = mkdtempSync(join(tmpdir(), "lb-blobs-"));
  // bun:test has no per-test teardown hook we can register from a helper, so
  // clean up on process exit instead — these are tiny temp dirs.
  process.on("exit", () => rmSync(root, { recursive: true, force: true }));
  return new FsBlobStore({ root, baseUrl: BASE_URL, secret: SECRET });
}

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

async function readAll(
  stream: ReadableStream<Uint8Array> | undefined
): Promise<string> {
  expect(stream).toBeDefined();
  return await new Response(stream).text();
}

// A key of the shape the routes actually use, plus one that would escape the
// store root if keys were ever treated as paths.
const KEY = "room_abc123/fl_iN9WvpTnFO4qXbLXpZ2Kr";
const OTHER_KEY = "room_abc123/fl_someOtherFile00000000";
const HOSTILE_KEY = "../../etc/passwd";

describe("FsBlobStore", () => {
  describe("put / head / get / delete", () => {
    test("put reports the observed size and head reads it back", async () => {
      const store = makeStore();
      const meta = await store.put(KEY, bytes("hello world"), TEXT);

      expect(meta).toEqual({ ...TEXT, size: 11 });
      expect(await store.head(KEY)).toEqual({ ...TEXT, size: 11 });
    });

    test("head is undefined for an object that was never written", async () => {
      const store = makeStore();
      expect(await store.head(KEY)).toBeUndefined();
    });

    test("get streams back exactly what was written", async () => {
      const store = makeStore();
      await store.put(KEY, bytes("hello world"), TEXT);
      expect(await readAll(await store.get(KEY))).toEqual("hello world");
    });

    test("get is undefined for an object that was never written", async () => {
      const store = makeStore();
      expect(await store.get(KEY)).toBeUndefined();
    });

    test("put accepts a stream, not just a buffer", async () => {
      const store = makeStore();
      const meta = await store.put(KEY, streamOf("streamed"), TEXT);

      expect(meta.size).toEqual(8);
      expect(await readAll(await store.get(KEY))).toEqual("streamed");
    });

    test("a zero-byte object is stored and is not the same as absent", async () => {
      const store = makeStore();
      await store.put(KEY, bytes(""), TEXT);

      expect(await store.head(KEY)).toEqual({ ...TEXT, size: 0 });
      expect(await readAll(await store.get(KEY))).toEqual("");
    });

    test("put replaces an existing object and its metadata", async () => {
      const store = makeStore();
      await store.put(KEY, bytes("first"), TEXT);
      await store.put(KEY, bytes("second version"), {
        contentType: "application/json",
        contentDisposition: 'inline; filename="other.json"',
      });

      expect(await store.head(KEY)).toEqual({
        contentType: "application/json",
        contentDisposition: 'inline; filename="other.json"',
        size: 14,
      });
    });

    test("delete removes the object", async () => {
      const store = makeStore();
      await store.put(KEY, bytes("hello world"), TEXT);
      await store.delete(KEY);

      expect(await store.head(KEY)).toBeUndefined();
      expect(await store.get(KEY)).toBeUndefined();
    });

    test("delete is a no-op for an object that doesn't exist", async () => {
      const store = makeStore();
      await store.delete(KEY);
      expect(await store.head(KEY)).toBeUndefined();
    });

    test("keys are flat names, so path-like keys can't escape the store", async () => {
      const store = makeStore();
      await store.put(HOSTILE_KEY, bytes("nope"), TEXT);

      // Round-trips as an ordinary key, and is not confusable with any other
      expect(await store.head(HOSTILE_KEY)).toEqual({ ...TEXT, size: 4 });
      expect(await store.head("etc/passwd")).toBeUndefined();
    });

    // Percent-encoding escapes "/" but not ".", so these are the only inputs
    // that would still read as path syntax once encoded.
    test.each(["..", ".", ""])(
      "a key of %p is refused rather than resolving to a directory",
      async (key) => {
        const store = makeStore();
        await expect(store.head(key)).rejects.toThrow(/Unsafe blob store name/);
        await expect(store.get(key)).rejects.toThrow(/Unsafe blob store name/);
        await expect(store.put(key, bytes("x"), TEXT)).rejects.toThrow(
          /Unsafe blob store name/
        );
      }
    );
  });

  describe("multipart", () => {
    test("parts uploaded out of order are assembled in part-number order", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);

      // Deliberately uploaded and listed back-to-front
      const third = await store.uploadPart(KEY, uploadId, 3, bytes("ccc"));
      const first = await store.uploadPart(KEY, uploadId, 1, bytes("aaa"));
      const second = await store.uploadPart(KEY, uploadId, 2, bytes("bbb"));

      const meta = await store.completeMultipart(KEY, uploadId, [
        third,
        second,
        first,
      ]);

      expect(meta).toEqual({ ...TEXT, size: 9 });
      expect(await readAll(await store.get(KEY))).toEqual("aaabbbccc");
    });

    test("the object does not exist until the upload is completed", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);
      await store.uploadPart(KEY, uploadId, 1, bytes("aaa"));

      expect(await store.head(KEY)).toBeUndefined();
    });

    test("re-uploading a part replaces it", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);
      await store.uploadPart(KEY, uploadId, 1, bytes("aaa"));
      const replaced = await store.uploadPart(KEY, uploadId, 1, bytes("zzz"));

      await store.completeMultipart(KEY, uploadId, [replaced]);
      expect(await readAll(await store.get(KEY))).toEqual("zzz");
    });

    test("etags identify part contents", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);

      const a = await store.uploadPart(KEY, uploadId, 1, bytes("same"));
      const b = await store.uploadPart(KEY, uploadId, 2, bytes("same"));
      const c = await store.uploadPart(KEY, uploadId, 3, bytes("different"));

      expect(a.etag).toEqual(b.etag);
      expect(a.etag).not.toEqual(c.etag);
    });

    test("completing with a mismatched etag is refused", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);
      const part = await store.uploadPart(KEY, uploadId, 1, bytes("aaa"));

      await expect(
        store.completeMultipart(KEY, uploadId, [
          { ...part, etag: "not-the-right-etag" },
        ])
      ).rejects.toThrow(/ETag mismatch/);
    });

    test("completing with a part that was never uploaded is refused", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);

      await expect(
        store.completeMultipart(KEY, uploadId, [{ partNumber: 7, etag: "x" }])
      ).rejects.toThrow(/No such part/);
    });

    test("abort discards the upload, leaving no object behind", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);
      const part = await store.uploadPart(KEY, uploadId, 1, bytes("aaa"));

      await store.abortMultipart(KEY, uploadId);

      expect(await store.head(KEY)).toBeUndefined();
      await expect(
        store.completeMultipart(KEY, uploadId, [part])
      ).rejects.toThrow(/No such multipart upload/);
    });

    test("an upload can't be driven against a different key", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);

      await expect(
        store.uploadPart("room_abc123/fl_someOtherFile00000000", uploadId, 1, bytes("aaa")) // prettier-ignore
      ).rejects.toThrow(/does not belong to/);
    });

    test("an upload can't be aborted against a different key", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);
      const part = await store.uploadPart(KEY, uploadId, 1, bytes("aaa"));

      await expect(store.abortMultipart(OTHER_KEY, uploadId)).rejects.toThrow(
        /does not belong to/
      );

      // ...and the upload it named is left intact
      await store.completeMultipart(KEY, uploadId, [part]);
      expect(await readAll(await store.get(KEY))).toEqual("aaa");
    });

    // The routes take <uploadId> straight from the URL with no decoder, so
    // this is the one identifier a caller fully controls. Left unchecked, ".."
    // resolves to the store root — where abort's recursive delete would land.
    test.each(["..", ".", ""])(
      "an upload id of %p is refused rather than resolving to the store root",
      async (uploadId) => {
        const store = makeStore();
        await store.put(KEY, bytes("untouched"), TEXT);

        await expect(store.abortMultipart(KEY, uploadId)).rejects.toThrow(
          /Unsafe blob store name/
        );
        await expect(
          store.uploadPart(KEY, uploadId, 1, bytes("x"))
        ).rejects.toThrow(/Unsafe blob store name/);

        // The store is still standing
        expect(await store.head(KEY)).toEqual({ ...TEXT, size: 9 });
      }
    );

    // A JS number can never interpolate into a "/", so this isn't a traversal
    // guard — it's the same "one identifier, one file" invariant as the names
    // above, and it stops nonsense part numbers becoming odd little files.
    test.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
      "a part number of %p is refused",
      async (partNumber) => {
        const store = makeStore();
        const uploadId = await store.createMultipart(KEY, TEXT);

        await expect(
          store.uploadPart(KEY, uploadId, partNumber, bytes("x"))
        ).rejects.toThrow(/Invalid part number/);
      }
    );

    test("aborting an upload that doesn't exist is a no-op", async () => {
      // The SDK aborts on failure paths, where the upload may never have been
      // created in the first place.
      const store = makeStore();
      await store.abortMultipart(KEY, "no-such-upload-id");
    });

    test("completing twice is refused, since the upload is gone", async () => {
      const store = makeStore();
      const uploadId = await store.createMultipart(KEY, TEXT);
      const part = await store.uploadPart(KEY, uploadId, 1, bytes("aaa"));
      await store.completeMultipart(KEY, uploadId, [part]);

      await expect(
        store.completeMultipart(KEY, uploadId, [part])
      ).rejects.toThrow(/No such multipart upload/);
    });
  });

  describe("signed URLs", () => {
    test("a freshly signed URL verifies and yields its key back", async () => {
      const store = makeStore();
      const url = new URL(await store.signedGetUrl(KEY, 3600));

      expect(url.origin).toEqual(BASE_URL);
      expect(store.verifySignedGetUrl(url.searchParams)).toEqual(KEY);
    });

    test("a tampered key is refused", async () => {
      const store = makeStore();
      const url = new URL(await store.signedGetUrl(KEY, 3600));
      url.searchParams.set("key", "room_abc123/fl_someOtherFile00000000");

      expect(store.verifySignedGetUrl(url.searchParams)).toBeUndefined();
    });

    test("a tampered signature is refused", async () => {
      const store = makeStore();
      const url = new URL(await store.signedGetUrl(KEY, 3600));
      url.searchParams.set("sig", "0".repeat(64));

      expect(store.verifySignedGetUrl(url.searchParams)).toBeUndefined();
    });

    test("extending the expiry without re-signing is refused", async () => {
      const store = makeStore();
      const url = new URL(await store.signedGetUrl(KEY, 3600));
      url.searchParams.set("exp", String(Date.now() + 999_999_999));

      expect(store.verifySignedGetUrl(url.searchParams)).toBeUndefined();
    });

    test("an expired URL is refused even though it is correctly signed", async () => {
      const store = makeStore();
      const url = new URL(await store.signedGetUrl(KEY, -1));

      expect(store.verifySignedGetUrl(url.searchParams)).toBeUndefined();
    });

    test("a URL signed with a different secret is refused", async () => {
      const store = makeStore();
      const url = new URL(await store.signedGetUrl(KEY, 3600));

      const otherStore = new FsBlobStore({
        root: mkdtempSync(join(tmpdir(), "lb-blobs-")),
        baseUrl: BASE_URL,
        secret: "a-different-secret",
      });
      expect(otherStore.verifySignedGetUrl(url.searchParams)).toBeUndefined();
    });

    test("missing params are refused rather than throwing", () => {
      const store = makeStore();
      expect(store.verifySignedGetUrl(new URLSearchParams())).toBeUndefined();
      expect(
        store.verifySignedGetUrl(new URLSearchParams({ key: KEY }))
      ).toBeUndefined();
    });

    test("signing does not require the object to exist", async () => {
      // head() is the existence check; signing is pure string work. The routes
      // rely on being able to check existence separately.
      const store = makeStore();
      const url = new URL(await store.signedGetUrl(KEY, 3600));
      expect(store.verifySignedGetUrl(url.searchParams)).toEqual(KEY);
    });
  });
});

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes(text));
      controller.close();
    },
  });
}
