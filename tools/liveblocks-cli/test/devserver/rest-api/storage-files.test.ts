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

import { ClientMsgCode, nanoid, OpCode } from "@liveblocks/core";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import * as Rooms from "~/dev-server/db/rooms";
import { zen as clientApi } from "~/dev-server/routes/client-api";
import { zen as publicApi } from "~/dev-server/routes/public";
import { zen as restApi } from "~/dev-server/routes/rest-api";

import { makeAccessToken, makeExternalRoomId } from "../_helpers";

const BASE = "http://localhost";
const SECRET = { Authorization: "Bearer sk_localdev" };

function makeFileId(): string {
  return `fl_${nanoid()}`;
}

async function api(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const headers: Record<string, string> = { ...SECRET };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return restApi.fetch(new Request(`${BASE}${path}`, init));
}

/** PUT a raw body (the upload routes take octet-stream, not JSON). */
async function putBlob(
  path: string,
  body: string,
  token = SECRET.Authorization
): Promise<Response> {
  const router = path.startsWith("/v2/c/") ? clientApi : restApi;
  return router.fetch(
    new Request(`${BASE}${path}`, {
      method: "PUT",
      headers: { Authorization: token },
      body,
    })
  );
}

async function clientApiCall(
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<Response> {
  const headers: Record<string, string> = { Authorization: token };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return clientApi.fetch(new Request(`${BASE}${path}`, init));
}

type FileData = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
};
type SignedFile = FileData & { url: string; expiresAt: string };
type Part = { partNumber: number; etag: string };
type ErrorBody = { error: string; message: string };
type StorageDoc = { data: { file: { data: { size: number } } } };

async function readJson<T>(resp: Response): Promise<T> {
  return (await resp.json()) as T;
}

/** Create a room and return its ID. */
async function makeRoom(): Promise<string> {
  const roomId = makeExternalRoomId();
  await api("POST", "/v2/rooms", { id: roomId });
  return roomId;
}

describe("REST API - storage files (LiveFile)", () => {
  beforeAll(() => Rooms.useEphemeralStorage());
  afterAll(() => Rooms.cleanup()); // Needed in bun:test (unlike in Vitest)

  describe("PUT /v2/rooms/<roomId>/storage/files/<fileId>/upload/<name>", () => {
    test("uploads a file and reports its server-measured metadata", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();

      const resp = await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );

      expect(resp.status).toBe(200);
      expect(await readJson<FileData>(resp)).toEqual({
        id: fileId,
        name: "hello.txt",
        size: 11,
        mimeType: "text/plain",
      });
    });

    test("returns 404 for a room that doesn't exist", async () => {
      const resp = await putBlob(
        `/v2/rooms/${makeExternalRoomId()}/storage/files/${makeFileId()}/upload/hello.txt`,
        "hello world"
      );
      expect(resp.status).toBe(404);
    });

    test("returns 400 for a malformed file id", async () => {
      const roomId = await makeRoom();
      const resp = await putBlob(
        `/v2/rooms/${roomId}/storage/files/not-a-file-id/upload/hello.txt`,
        "hello world"
      );
      expect(resp.status).toBe(400);
    });

    test("repeating the same upload returns the existing file", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      const path = `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`;

      const first = await putBlob(path, "hello world");
      const second = await putBlob(path, "hello world");

      expect(second.status).toBe(200);
      expect(await readJson<FileData>(second)).toEqual(
        await readJson<FileData>(first)
      );
    });

    test("reusing a file id for a different name is a conflict", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();

      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );
      const resp = await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/other.txt`,
        "hello world"
      );

      expect(resp.status).toBe(409);
    });

    test("repeating an upload with a mismatched fileSize is a conflict", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      const path = `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`;

      await putBlob(path, "hello world");
      const resp = await putBlob(`${path}?fileSize=999`, "hello world");

      expect(resp.status).toBe(409);
    });

    test("filenames with quotes survive the content-disposition round-trip", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      const name = 'we"ird\\name.txt';

      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/${encodeURIComponent(name)}`,
        "hello world"
      );

      const resp = await api(
        "GET",
        `/v2/rooms/${roomId}/storage/files/${fileId}`
      );
      expect((await readJson<FileData>(resp)).name).toEqual(name);
    });

    test("a zero-byte file uploads and is recorded", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();

      const resp = await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/empty.txt`,
        ""
      );

      expect(resp.status).toBe(200);
      expect((await readJson<FileData>(resp)).size).toBe(0);

      // A zero-byte file is uploaded, so referencing it must be allowed
      expect(
        Rooms.getRoomInstance(roomId).driver.get_livefile_upload_size(fileId)
      ).toBe(0);
    });
  });

  describe("GET /v2/rooms/<roomId>/storage/files/<fileId>", () => {
    test("returns metadata plus a signed URL", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );

      const resp = await api(
        "GET",
        `/v2/rooms/${roomId}/storage/files/${fileId}`
      );
      expect(resp.status).toBe(200);

      const body = await readJson<SignedFile>(resp);
      expect(body).toMatchObject({
        id: fileId,
        name: "hello.txt",
        size: 11,
        mimeType: "text/plain",
      });
      expect(typeof body.url).toBe("string");
      expect(Date.parse(body.expiresAt)).toBeGreaterThan(Date.now());
    });

    test("returns 404 for a file that was never uploaded", async () => {
      const roomId = await makeRoom();
      const resp = await api(
        "GET",
        `/v2/rooms/${roomId}/storage/files/${makeFileId()}`
      );
      expect(resp.status).toBe(404);
    });

    test("a file uploaded to another room is not visible", async () => {
      const roomA = await makeRoom();
      const roomB = await makeRoom();
      const fileId = makeFileId();
      await putBlob(
        `/v2/rooms/${roomA}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );

      const resp = await api("GET", `/v2/rooms/${roomB}/storage/files/${fileId}`); // prettier-ignore
      expect(resp.status).toBe(404);
    });
  });

  describe("GET /blob", () => {
    test("a signed URL serves the bytes with their metadata", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );

      const { url } = await readJson<SignedFile>(
        await api("GET", `/v2/rooms/${roomId}/storage/files/${fileId}`)
      );

      // No Authorization header: the browser fetching this URL has none
      const resp = await publicApi.fetch(new Request(url));

      expect(resp.status).toBe(200);
      expect(await resp.text()).toEqual("hello world");
      expect(resp.headers.get("content-type")).toBe("text/plain");
      expect(resp.headers.get("content-disposition")).toBe(
        'inline; filename="hello.txt"'
      );
    });

    test("a tampered signature is refused", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );

      const { url } = await readJson<SignedFile>(
        await api("GET", `/v2/rooms/${roomId}/storage/files/${fileId}`)
      );

      const tampered = new URL(url);
      tampered.searchParams.set("sig", "0".repeat(64));

      const resp = await publicApi.fetch(new Request(tampered));
      expect(resp.status).toBe(403);
    });

    test("an unsigned request is refused", async () => {
      const resp = await publicApi.fetch(
        new Request(`${BASE}/blob?key=whatever`)
      );
      expect(resp.status).toBe(403);
    });
  });

  describe("multipart upload", () => {
    test("uploads a file across parts, assembled in order", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();

      const created = await api(
        "POST",
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/hello.txt`
      );
      expect(created.status).toBe(200);
      const { uploadId } = await readJson<{ uploadId: string }>(created);
      expect(typeof uploadId).toBe("string");

      // Uploaded back-to-front on purpose
      const second = await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/${uploadId}/2`,
        "world"
      );
      const first = await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/${uploadId}/1`,
        "hello "
      );

      const completed = await api(
        "POST",
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/${uploadId}/complete`,
        {
          parts: [await readJson<Part>(second), await readJson<Part>(first)],
        }
      );

      expect(completed.status).toBe(200);
      expect(await readJson<FileData>(completed)).toEqual({
        id: fileId,
        name: "hello.txt",
        size: 11,
        mimeType: "text/plain",
      });

      const { url } = await readJson<SignedFile>(
        await api("GET", `/v2/rooms/${roomId}/storage/files/${fileId}`)
      );
      expect(await (await publicApi.fetch(new Request(url))).text()).toEqual(
        "hello world"
      );
    });

    test("a malformed upload id is rejected at the router", async () => {
      // The dev server's blob store turns the upload id into a directory name,
      // so it's checked before it reaches any path building. Production hands
      // it to R2 as an opaque token and has no such concern.
      //
      // Note there's no case for ".." here: the URL parser collapses dot
      // segments — even percent-encoded ones — so one can never arrive as a
      // path parameter in the first place. FsBlobStore refuses it anyway, for
      // callers that aren't routes.
      const roomId = await makeRoom();
      const fileId = makeFileId();

      const resp = await api(
        "DELETE",
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/not-a-uuid`
      );
      expect(resp.status).toBe(400);
    });

    test("creating an upload for an existing file is a conflict", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );

      const resp = await api(
        "POST",
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/hello.txt`
      );
      expect(resp.status).toBe(409);
    });

    test("aborting discards the upload, leaving no file behind", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();

      const { uploadId } = await readJson<{ uploadId: string }>(
        await api(
          "POST",
          `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/hello.txt`
        )
      );
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/${uploadId}/1`,
        "hello"
      );

      const aborted = await api(
        "DELETE",
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/${uploadId}`
      );
      expect(aborted.status).toBe(200);

      const resp = await api(
        "GET",
        `/v2/rooms/${roomId}/storage/files/${fileId}`
      );
      expect(resp.status).toBe(404);
    });

    test("the file is not readable until the upload completes", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();

      const { uploadId } = await readJson<{ uploadId: string }>(
        await api(
          "POST",
          `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/hello.txt`
        )
      );
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/multipart/${uploadId}/1`,
        "hello"
      );

      const resp = await api(
        "GET",
        `/v2/rooms/${roomId}/storage/files/${fileId}`
      );
      expect(resp.status).toBe(404);
    });
  });

  describe("POST /v2/c/rooms/<roomId>/storage/files/presigned-urls", () => {
    test("distinguishes referenced, uploaded-but-unreferenced, and unknown", async () => {
      const roomId = await makeRoom();
      const token = makeAccessToken(roomId);

      const referencedId = makeFileId();
      const uploadedOnlyId = makeFileId();
      const unknownId = makeFileId();

      // One file uploaded and referenced from Storage...
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${referencedId}/upload/a.txt`,
        "aaa"
      );
      await api("POST", `/v2/rooms/${roomId}/storage`, {
        liveblocksType: "LiveObject",
        data: {
          file: {
            liveblocksType: "LiveFile",
            data: {
              id: referencedId,
              name: "a.txt",
              size: 3,
              mimeType: "text/plain",
            },
          },
        },
      });

      // ...one uploaded but not referenced...
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${uploadedOnlyId}/upload/b.txt`,
        "bbb"
      );

      // ...and one we've never heard of.
      const resp = await clientApiCall(
        "POST",
        `/v2/c/rooms/${roomId}/storage/files/presigned-urls`,
        token,
        { fileIds: [referencedId, uploadedOnlyId, unknownId] }
      );

      expect(resp.status).toBe(200);
      const { urls } = await readJson<{ urls: (string | false | null)[] }>(
        resp
      );
      expect(typeof urls[0]).toBe("string");
      expect(urls[1]).toBe(false);
      expect(urls[2]).toBe(null);
    });

    test("returns one entry per requested id, including duplicates", async () => {
      const roomId = await makeRoom();
      const token = makeAccessToken(roomId);
      const fileId = makeFileId();

      const resp = await clientApiCall(
        "POST",
        `/v2/c/rooms/${roomId}/storage/files/presigned-urls`,
        token,
        { fileIds: [fileId, fileId] }
      );

      const { urls } = await readJson<{ urls: (string | false | null)[] }>(
        resp
      );
      expect(urls).toEqual([null, null]);
    });

    test("rejects a malformed file id", async () => {
      const roomId = await makeRoom();
      const token = makeAccessToken(roomId);

      const resp = await clientApiCall(
        "POST",
        `/v2/c/rooms/${roomId}/storage/files/presigned-urls`,
        token,
        { fileIds: ["nope"] }
      );
      expect(resp.status).toBe(422);
    });
  });

  describe("the client-api routes mirror the secret-key ones", () => {
    test("upload works through /v2/c with an access token", async () => {
      const roomId = await makeRoom();
      const token = makeAccessToken(roomId);
      const fileId = makeFileId();

      const resp = await putBlob(
        `/v2/c/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world",
        token
      );

      expect(resp.status).toBe(200);
      expect((await readJson<FileData>(resp)).size).toBe(11);
    });

    test("upload through /v2/c is refused without a token", async () => {
      const roomId = await makeRoom();
      const resp = await clientApi.fetch(
        new Request(
          `${BASE}/v2/c/rooms/${roomId}/storage/files/${makeFileId()}/upload/hello.txt`,
          { method: "PUT", body: "hello world" }
        )
      );
      expect(resp.status).toBe(403);
    });
  });

  describe("upload-before-reference", () => {
    test("send-message refuses a LiveFile that was never uploaded", async () => {
      const roomId = await makeRoom();

      const resp = await api("POST", `/v2/rooms/${roomId}/send-message`, {
        messages: [
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                type: OpCode.CREATE_FILE,
                id: "1:0",
                parentId: "root",
                parentKey: "file",
                data: {
                  id: makeFileId(),
                  name: "ghost.txt",
                  size: 1,
                  mimeType: "text/plain",
                },
                opId: "1:1",
              },
            ],
          },
        ],
      });

      expect(resp.status).toBe(422);
      expect((await readJson<ErrorBody>(resp)).message).toBe(
        "Storage file has not been uploaded"
      );
    });

    test("send-message accepts an uploaded LiveFile, and overrides its size", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );

      const resp = await api("POST", `/v2/rooms/${roomId}/send-message`, {
        messages: [
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                type: OpCode.CREATE_FILE,
                id: "1:0",
                parentId: "root",
                parentKey: "file",
                // The client claims 1 byte. It uploaded 11.
                data: {
                  id: fileId,
                  name: "hello.txt",
                  size: 1,
                  mimeType: "text/plain",
                },
                opId: "1:1",
              },
            ],
          },
        ],
      });
      expect(resp.status).toBe(200);

      const storage = await readJson<StorageDoc>(
        await api("GET", `/v2/rooms/${roomId}/storage`)
      );
      expect(storage.data.file.data.size).toBe(11);
    });

    test("storage init refuses a LiveFile that was never uploaded", async () => {
      const roomId = await makeRoom();

      const resp = await api("POST", `/v2/rooms/${roomId}/storage`, {
        liveblocksType: "LiveObject",
        data: {
          file: {
            liveblocksType: "LiveFile",
            data: {
              id: makeFileId(),
              name: "ghost.txt",
              size: 1,
              mimeType: "text/plain",
            },
          },
        },
      });

      expect(resp.status).toBe(422);
      expect((await readJson<ErrorBody>(resp)).message).toBe(
        "Storage file has not been uploaded"
      );
    });

    test("storage init overrides a claimed size with the uploaded one", async () => {
      const roomId = await makeRoom();
      const fileId = makeFileId();
      await putBlob(
        `/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
        "hello world"
      );

      await api("POST", `/v2/rooms/${roomId}/storage`, {
        liveblocksType: "LiveObject",
        data: {
          file: {
            liveblocksType: "LiveFile",
            data: {
              id: fileId,
              name: "hello.txt",
              size: 1,
              mimeType: "text/plain",
            },
          },
        },
      });

      const storage = await readJson<StorageDoc>(
        await api("GET", `/v2/rooms/${roomId}/storage`)
      );
      expect(storage.data.file.data.size).toBe(11);
    });
  });
});
