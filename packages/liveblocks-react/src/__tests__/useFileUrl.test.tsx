import type { LiveFileData } from "@liveblocks/client";
import { LiveFile } from "@liveblocks/client";
import { renderHook, screen } from "@testing-library/react";
import type { HttpResponseResolver } from "msw";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import MockWebSocket from "./_MockWebSocket";
import { createContextsForTest } from "./_utils";

const BASE_URL = "https://example.com";
const ROOM_ID = "room";
const FILE_ID = "fl_123456789012345678901";
const OTHER_FILE_ID = "fl_abcdefghijklmnopqrstu";
const THIRD_FILE_ID = "fl_zyxwvutsrqponmlkjihgf";
const FILE_URL = "https://example.com/file.txt";
const OTHER_FILE_URL = "https://example.com/other-file.txt";
const THIRD_FILE_URL = "https://example.com/third-file.txt";
const DEFAULT_URL_LIFETIME = 60_000;
// File URLs are evicted from the client cache 30 seconds before they expire.
const SOON_EXPIRING_URL_LIFETIME = 30_750;

type FileReference = string | LiveFileData | LiveFile;
type FileUrlsRequestBody = { fileIds: string[] };
type FileUrlsResponseBody = {
  urls: (string | null)[];
  expiresAt: string;
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.reset();
});

afterEach(() => {
  MockWebSocket.reset();
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => server.close());

function mockGetFileUrls(
  resolver: HttpResponseResolver<
    { roomId: string },
    FileUrlsRequestBody,
    FileUrlsResponseBody
  >
) {
  return http.post(
    `${BASE_URL}/v2/c/rooms/:roomId/storage/files/presigned-urls`,
    resolver
  );
}

function fileUrlsResponse(
  urls: (string | null)[],
  expiresIn = DEFAULT_URL_LIFETIME
): HttpResponse<FileUrlsResponseBody> {
  return HttpResponse.json<FileUrlsResponseBody>({
    urls,
    expiresAt: new Date(Date.now() + expiresIn).toISOString(),
  });
}

function fileUrlsErrorResponse(): HttpResponse<FileUrlsResponseBody> {
  return HttpResponse.json<FileUrlsResponseBody>(
    {
      urls: [],
      expiresAt: new Date().toISOString(),
    },
    { status: 500 }
  );
}

function getFileUrl(fileId: string): string {
  if (fileId === FILE_ID) {
    return FILE_URL;
  }

  if (fileId === OTHER_FILE_ID) {
    return OTHER_FILE_URL;
  }

  if (fileId === THIRD_FILE_ID) {
    return THIRD_FILE_URL;
  }

  throw new Error(`Unexpected file ID: ${fileId}`);
}

describe("useFileUrl", () => {
  test("returns a loading state followed by the presigned URL", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(async ({ params, request }) => {
        requestCount++;
        expect(params.roomId).toBe(ROOM_ID);
        expect(await request.json()).toEqual({ fileIds: [FILE_ID] });
        return fileUrlsResponse([FILE_URL]);
      })
    );

    const {
      room: { RoomProvider, useFileUrl },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });
    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: FILE_URL,
      });
    expect(requestCount).toBe(1);

    unmount();
  });

  test("supports changing between file IDs, file data, and LiveFile instances", async () => {
    const requests: string[][] = [];
    server.use(
      mockGetFileUrls(async ({ request }) => {
        const { fileIds } = await request.json();
        requests.push(fileIds);
        return fileUrlsResponse(fileIds.map(getFileUrl));
      })
    );

    const fileData: LiveFileData = {
      id: OTHER_FILE_ID,
      name: "other-file.txt",
      size: 12,
      mimeType: "text/plain",
    };
    const liveFile = new LiveFile({
      id: THIRD_FILE_ID,
      name: "third-file.txt",
      size: 24,
      mimeType: "text/plain",
    });
    const {
      room: { RoomProvider, useFileUrl },
    } = createContextsForTest({ baseUrl: BASE_URL });
    const initialProps: { file: FileReference } = { file: FILE_ID };

    const { result, rerender, unmount } = renderHook(
      ({ file }: { file: FileReference }) => useFileUrl(file),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={ROOM_ID}>{children}</RoomProvider>
        ),
        initialProps,
      }
    );

    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: FILE_URL,
      });

    rerender({ file: fileData });
    expect(result.current).toEqual({ isLoading: true });
    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: OTHER_FILE_URL,
      });

    rerender({ file: liveFile });
    expect(result.current).toEqual({ isLoading: true });
    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: THIRD_FILE_URL,
      });

    expect(requests).toEqual([[FILE_ID], [OTHER_FILE_ID], [THIRD_FILE_ID]]);

    unmount();
  });

  test("caches results by file ID", async () => {
    const requests: string[][] = [];
    server.use(
      mockGetFileUrls(async ({ request }) => {
        const { fileIds } = await request.json();
        requests.push(fileIds);
        return fileUrlsResponse(fileIds.map(getFileUrl));
      })
    );

    const {
      room: { RoomProvider, useFileUrl },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, rerender, unmount } = renderHook(
      ({ fileId }: { fileId: string }) => useFileUrl(fileId),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={ROOM_ID}>{children}</RoomProvider>
        ),
        initialProps: { fileId: FILE_ID },
      }
    );

    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: FILE_URL,
      });

    rerender({ fileId: OTHER_FILE_ID });
    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: OTHER_FILE_URL,
      });

    rerender({ fileId: FILE_ID });
    expect(result.current).toEqual({
      isLoading: false,
      url: FILE_URL,
    });
    expect(requests).toEqual([[FILE_ID], [OTHER_FILE_ID]]);

    unmount();
  });

  test("batches and deduplicates requests", async () => {
    const requests: string[][] = [];
    server.use(
      mockGetFileUrls(async ({ request }) => {
        const { fileIds } = await request.json();
        requests.push(fileIds);
        return fileUrlsResponse(fileIds.map(getFileUrl));
      })
    );

    const {
      room: { RoomProvider, useFileUrl },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(
      () => ({
        file: useFileUrl(FILE_ID),
        duplicateFile: useFileUrl(FILE_ID),
        otherFile: useFileUrl(OTHER_FILE_ID),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={ROOM_ID}>{children}</RoomProvider>
        ),
      }
    );

    await expect
      .poll(() => result.current)
      .toEqual({
        file: {
          isLoading: false,
          url: FILE_URL,
        },
        duplicateFile: {
          isLoading: false,
          url: FILE_URL,
        },
        otherFile: {
          isLoading: false,
          url: OTHER_FILE_URL,
        },
      });
    expect(requests).toEqual([[FILE_ID, OTHER_FILE_ID]]);

    unmount();
  });

  test("returns permanent request errors", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(() => {
        requestCount++;
        return fileUrlsErrorResponse();
      })
    );

    const {
      room: { RoomProvider, useFileUrl },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });
    await expect.poll(() => result.current.isLoading).toBe(false);
    expect(result.current).toEqual({
      isLoading: false,
      error: expect.any(Error),
    });
    expect(requestCount).toBe(1);

    unmount();
  });

  test("retries errors while getting the file URL", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(() => {
        requestCount++;
        return fileUrlsResponse([requestCount === 1 ? null : FILE_URL]);
      })
    );

    const {
      room: { RoomProvider, useFileUrl },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });
    await expect.poll(() => result.current.isLoading).toBe(false);
    expect(result.current).toEqual({
      isLoading: false,
      error: expect.any(Error),
    });

    await expect
      .poll(() => result.current, { timeout: 2_500 })
      .toEqual({
        isLoading: false,
        url: FILE_URL,
      });
    expect(requestCount).toBe(2);

    unmount();
  });

  test("stops retrying when the file URL remains unavailable", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(() => {
        requestCount++;
        return fileUrlsResponse([null]);
      })
    );

    const {
      room: { RoomProvider, useFileUrl },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>{children}</RoomProvider>
      ),
    });

    await expect.poll(() => requestCount, { timeout: 3_500 }).toBe(3);
    expect(result.current).toEqual({
      isLoading: false,
      error: expect.any(Error),
    });

    await new Promise((resolve) => setTimeout(resolve, 1_250));
    expect(requestCount).toBe(3);

    unmount();
  });

  test("refreshes the URL when its cache expires", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(() => {
        requestCount++;
        return requestCount === 1
          ? fileUrlsResponse([FILE_URL], SOON_EXPIRING_URL_LIFETIME)
          : fileUrlsResponse([OTHER_FILE_URL]);
      })
    );

    const {
      room: { RoomProvider, useFileUrl },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>{children}</RoomProvider>
      ),
    });

    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: FILE_URL,
      });
    await expect
      .poll(() => result.current, { timeout: 2_500 })
      .toEqual({
        isLoading: false,
        url: OTHER_FILE_URL,
      });
    expect(requestCount).toBe(2);

    unmount();
  });
});

describe("useFileUrlSuspense", () => {
  test("suspends while loading and returns the presigned URL", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(async ({ params, request }) => {
        requestCount++;
        expect(params.roomId).toBe(ROOM_ID);
        expect(await request.json()).toEqual({ fileIds: [FILE_ID] });
        return fileUrlsResponse([FILE_URL]);
      })
    );

    const {
      room: {
        RoomProvider,
        suspense: { useFileUrl },
      },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>
          <Suspense fallback={<div>Loading</div>}>
            <div>Loaded</div>
            {children}
          </Suspense>
        </RoomProvider>
      ),
    });

    expect(result.current).toBeNull();
    expect(await screen.findByText("Loading")).toBeInTheDocument();
    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: FILE_URL,
        error: undefined,
      });
    expect(screen.getByText("Loaded")).toBeInTheDocument();
    expect(requestCount).toBe(1);

    unmount();
  });

  test("triggers an error boundary for permanent request errors", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(() => {
        requestCount++;
        return fileUrlsErrorResponse();
      })
    );

    const {
      room: {
        RoomProvider,
        suspense: { useFileUrl },
      },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>
          <ErrorBoundary fallback={<div>Error</div>}>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </ErrorBoundary>
        </RoomProvider>
      ),
    });

    expect(result.current).toBeNull();
    expect(await screen.findByText("Loading")).toBeInTheDocument();
    expect(await screen.findByText("Error")).toBeInTheDocument();
    expect(requestCount).toBe(1);

    unmount();
  });

  test("retries errors while getting the file URL", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(async ({ request }) => {
        requestCount++;
        expect(await request.json()).toEqual({ fileIds: [FILE_ID] });
        return fileUrlsResponse([requestCount === 1 ? null : FILE_URL]);
      })
    );

    const {
      room: {
        RoomProvider,
        suspense: { useFileUrl },
      },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>
          <ErrorBoundary fallback={<div>Error</div>}>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </ErrorBoundary>
        </RoomProvider>
      ),
    });

    expect(result.current).toBeNull();
    expect(await screen.findByText("Loading")).toBeInTheDocument();
    expect(screen.queryByText("Error")).not.toBeInTheDocument();

    await expect
      .poll(() => result.current, { timeout: 2_500 })
      .toEqual({
        isLoading: false,
        url: FILE_URL,
        error: undefined,
      });
    expect(screen.queryByText("Error")).not.toBeInTheDocument();
    expect(requestCount).toBe(2);

    unmount();
  });

  test("triggers an error boundary when the file URL remains unavailable", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(() => {
        requestCount++;
        return fileUrlsResponse([null]);
      })
    );

    const {
      room: {
        RoomProvider,
        suspense: { useFileUrl },
      },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>
          <ErrorBoundary fallback={<div>Error</div>}>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </ErrorBoundary>
        </RoomProvider>
      ),
    });

    expect(result.current).toBeNull();
    expect(await screen.findByText("Loading")).toBeInTheDocument();
    expect(
      await screen.findByText("Error", undefined, { timeout: 3_500 })
    ).toBeInTheDocument();
    expect(requestCount).toBe(3);

    unmount();
  });

  test("suspends again when the URL cache expires", async () => {
    let requestCount = 0;
    server.use(
      mockGetFileUrls(() => {
        requestCount++;
        return requestCount === 1
          ? fileUrlsResponse([FILE_URL], SOON_EXPIRING_URL_LIFETIME)
          : fileUrlsResponse([OTHER_FILE_URL]);
      })
    );

    const {
      room: {
        RoomProvider,
        suspense: { useFileUrl },
      },
    } = createContextsForTest({ baseUrl: BASE_URL });

    const { result, unmount } = renderHook(() => useFileUrl(FILE_ID), {
      wrapper: ({ children }) => (
        <RoomProvider id={ROOM_ID}>
          <Suspense fallback={<div>Loading</div>}>
            <div>Loaded</div>
            {children}
          </Suspense>
        </RoomProvider>
      ),
    });

    expect(await screen.findByText("Loading")).toBeInTheDocument();
    await expect
      .poll(() => result.current)
      .toEqual({
        isLoading: false,
        url: FILE_URL,
        error: undefined,
      });
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
    expect(screen.getByText("Loaded")).toBeInTheDocument();

    expect(
      await screen.findByText("Loading", undefined, { timeout: 2_500 })
    ).toBeInTheDocument();
    await expect
      .poll(() => result.current, { timeout: 2_500 })
      .toEqual({
        isLoading: false,
        url: OTHER_FILE_URL,
        error: undefined,
      });
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
    expect(screen.getByText("Loaded")).toBeInTheDocument();
    expect(requestCount).toBe(2);

    unmount();
  });
});
