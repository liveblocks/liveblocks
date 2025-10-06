import "@testing-library/jest-dom";

import type { UrlMetadata } from "@liveblocks/core";
import { renderHook, screen, waitFor } from "@testing-library/react";
import type { ResponseResolver, RestContext, RestRequest } from "msw";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import MockWebSocket from "./_MockWebSocket";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.reset();
});

afterEach(() => {
  MockWebSocket.reset();
  server.resetHandlers();
  jest.clearAllTimers();
  jest.clearAllMocks();
});

afterAll(() => server.close());

function mockGetUrlMetadata(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    UrlMetadata
  >
) {
  return rest.get("https://api.liveblocks.io/v2/c/urls/metadata", resolver);
}

describe("useUrlMetadata", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should fetch URL metadata", async () => {
    const url = "https://liveblocks.io";
    const metadata: UrlMetadata = {
      title: "Liveblocks",
      description:
        "Liveblocks gives you ready-made features like AI Copilots, Comments, and Multiplayer Editing to make your product more engaging and grow your business.",
      favicon: "https://liveblocks.io/favicon.svg",
      image: "https://liveblocks.io/og.jpg",
    };

    server.use(
      mockGetUrlMetadata((req, res, ctx) => {
        expect(req.url.searchParams.get("url")).toBe(url);
        return res(ctx.json(metadata));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUrlMetadata },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useUrlMetadata(url), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        metadata,
      })
    );

    unmount();
  });

  test("should cache URL metadata and not refetch the same URL", async () => {
    const url = "https://liveblocks.io";
    const metadata: UrlMetadata = {
      title: "Liveblocks",
      description:
        "Liveblocks gives you ready-made features like AI Copilots, Comments, and Multiplayer Editing to make your product more engaging and grow your business.",
    };

    let fetchCount = 0;
    server.use(
      mockGetUrlMetadata((_req, res, ctx) => {
        fetchCount++;
        return res(ctx.json(metadata));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUrlMetadata },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useUrlMetadata(url),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current).toEqual({
      isLoading: false,
      metadata,
    });

    // Rerender should not trigger a refetch
    rerender();

    expect(result.current).toEqual({
      isLoading: false,
      metadata,
    });

    expect(fetchCount).toBe(1);

    unmount();
  });

  test("should fetch different metadata when URL changes", async () => {
    const url1 = "https://github.com";
    const url2 = "https://letterboxd.com";

    const metadata1: UrlMetadata = {
      title:
        "GitHub · Build and ship software on a single, collaborative platform · GitHub",
      description:
        "Join the world's most widely adopted, AI-powered developer platform where millions of developers, businesses, and the largest open source community build software that advances humanity.",
    };

    const metadata2: UrlMetadata = {
      title: "Letterboxd • Social film discovery.",
      description:
        "Letterboxd is a social platform for sharing your taste in film. Use it as a diary to record your opinion about films as you watch them, or just to keep track of films you’ve seen in the past. Rate, review and tag films as you add them. Find and follow your friends to see what they’re enjoying. Keep a watchlist of films you’d like to see, and create lists/collections on any topic.",
    };

    server.use(
      mockGetUrlMetadata((req, res, ctx) => {
        const requestedUrl = req.url.searchParams.get("url");
        if (requestedUrl === url1) {
          return res(ctx.json(metadata1));
        } else if (requestedUrl === url2) {
          return res(ctx.json(metadata2));
        }
        return res(ctx.status(404));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUrlMetadata },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      ({ url }: { url: string }) => useUrlMetadata(url),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
        initialProps: { url: url1 },
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current).toEqual({
      isLoading: false,
      metadata: metadata1,
    });

    // Change URL
    rerender({ url: url2 });

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current).toEqual({
      isLoading: false,
      metadata: metadata2,
    });

    unmount();
  });

  test("should return cached metadata when switching back to a previously fetched URL", async () => {
    const url1 = "https://github.com";
    const url2 = "https://letterboxd.com";

    const metadata1: UrlMetadata = {
      title:
        "GitHub · Build and ship software on a single, collaborative platform · GitHub",
      description:
        "Join the world's most widely adopted, AI-powered developer platform where millions of developers, businesses, and the largest open source community build software that advances humanity.",
    };

    const metadata2: UrlMetadata = {
      title: "Letterboxd • Social film discovery.",
      description:
        "Letterboxd is a social platform for sharing your taste in film. Use it as a diary to record your opinion about films as you watch them, or just to keep track of films you’ve seen in the past. Rate, review and tag films as you add them. Find and follow your friends to see what they’re enjoying. Keep a watchlist of films you’d like to see, and create lists/collections on any topic.",
    };

    let fetchCount = 0;
    server.use(
      mockGetUrlMetadata((_req, res, ctx) => {
        fetchCount++;
        const requestedUrl = _req.url.searchParams.get("url");
        if (requestedUrl === url1) {
          return res(ctx.json(metadata1));
        } else if (requestedUrl === url2) {
          return res(ctx.json(metadata2));
        }
        return res(ctx.status(404));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUrlMetadata },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      ({ url }: { url: string }) => useUrlMetadata(url),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
        initialProps: { url: url1 },
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    // Change to URL 2
    rerender({ url: url2 });
    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    // Change back to URL 1 - should use cached data
    rerender({ url: url1 });

    expect(result.current).toEqual({
      isLoading: false,
      metadata: metadata1,
    });

    // Should have only fetched twice (once for each URL)
    expect(fetchCount).toBe(2);

    unmount();
  });

  test("should handle multiple hooks with the same URL", async () => {
    const url = "https://liveblocks.io";
    const metadata: UrlMetadata = {
      title: "Liveblocks",
      description:
        "Liveblocks gives you ready-made features like AI Copilots, Comments, and Multiplayer Editing to make your product more engaging and grow your business.",
      favicon: "https://liveblocks.io/favicon.svg",
      image: "https://liveblocks.io/og.jpg",
    };

    let fetchCount = 0;
    server.use(
      mockGetUrlMetadata((_req, res, ctx) => {
        fetchCount++;
        return res(ctx.json(metadata));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUrlMetadata },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        metadata1: useUrlMetadata(url),
        metadata2: useUrlMetadata(url),
        metadata3: useUrlMetadata(url),
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.metadata1.isLoading).toBeFalsy();
      expect(result.current.metadata2.isLoading).toBeFalsy();
      expect(result.current.metadata3.isLoading).toBeFalsy();
    });

    expect(result.current.metadata1).toEqual({
      isLoading: false,
      metadata,
    });

    expect(result.current.metadata2).toEqual({
      isLoading: false,
      metadata,
    });

    expect(result.current.metadata3).toEqual({
      isLoading: false,
      metadata,
    });

    // Should only fetch once despite multiple hook calls
    expect(fetchCount).toBe(1);

    unmount();
  });

  test("should return error if initial fetch throws an error", async () => {
    let getUrlMetadataReqCount = 0;
    const url = "https://github.com";

    server.use(
      mockGetUrlMetadata((_req, res, ctx) => {
        getUrlMetadataReqCount++;
        return res(ctx.status(500));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUrlMetadata },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useUrlMetadata(url), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // Wait until all fetch attempts have been done
    await jest.advanceTimersToNextTimerAsync(); // fetch attempt 1

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(5));

    await waitFor(() => {
      expect(result.current).toEqual({
        isLoading: false,
        error: expect.any(Error),
      });
    });

    // Wait for 5 seconds for the error to clear
    await jest.advanceTimersByTimeAsync(5_000);

    // A new fetch request should have been made after the error cleared
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(6));
    expect(result.current).toEqual({
      isLoading: true,
    });

    unmount();
  });
});

describe("useUrlMetadataSuspense", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should suspend and fetch URL metadata", async () => {
    const url = "https://liveblocks.io";
    const metadata: UrlMetadata = {
      title: "Liveblocks",
      description:
        "Liveblocks gives you ready-made features like AI Copilots, Comments, and Multiplayer Editing to make your product more engaging and grow your business.",
      favicon: "https://liveblocks.io/favicon.svg",
      image: "https://liveblocks.io/og.jpg",
    };

    server.use(
      mockGetUrlMetadata((_req, res, ctx) => {
        return res(ctx.json(metadata));
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useUrlMetadata },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useUrlMetadata(url), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>
          <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
        </LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual(null);

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        metadata,
      })
    );

    unmount();
  });

  test("should trigger error boundary if fetch throws an error", async () => {
    let getUrlMetadataReqCount = 0;
    const url = "https://github.com";

    server.use(
      mockGetUrlMetadata((_req, res, ctx) => {
        getUrlMetadataReqCount++;
        return res(ctx.status(500));
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useUrlMetadata },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useUrlMetadata(url), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>
          <ErrorBoundary
            fallback={<div>There was an error while getting URL metadata.</div>}
          >
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </ErrorBoundary>
        </LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual(null);

    expect(screen.getByText("Loading")).toBeInTheDocument();

    // Wait until all fetch attempts have been done
    await jest.advanceTimersToNextTimerAsync(); // fetch attempt 1

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getUrlMetadataReqCount).toBe(5));

    // Check if the error boundary's fallback is displayed
    await waitFor(() => {
      expect(
        screen.getByText("There was an error while getting URL metadata.")
      ).toBeInTheDocument();
    });

    unmount();
  });

  test("should use cached data immediately when switching back to a previously fetched URL", async () => {
    const url1 = "https://github.com";
    const url2 = "https://letterboxd.com";

    const metadata1: UrlMetadata = {
      title:
        "GitHub · Build and ship software on a single, collaborative platform · GitHub",
      description:
        "Join the world's most widely adopted, AI-powered developer platform where millions of developers, businesses, and the largest open source community build software that advances humanity.",
    };

    const metadata2: UrlMetadata = {
      title: "Letterboxd • Social film discovery.",
      description:
        "Letterboxd is a social platform for sharing your taste in film. Use it as a diary to record your opinion about films as you watch them, or just to keep track of films you’ve seen in the past. Rate, review and tag films as you add them. Find and follow your friends to see what they’re enjoying. Keep a watchlist of films you’d like to see, and create lists/collections on any topic.",
    };

    server.use(
      mockGetUrlMetadata((_req, res, ctx) => {
        const requestedUrl = _req.url.searchParams.get("url");
        if (requestedUrl === url1) {
          return res(ctx.json(metadata1));
        } else if (requestedUrl === url2) {
          return res(ctx.json(metadata2));
        }
        return res(ctx.status(404));
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useUrlMetadata },
      },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      ({ url }: { url: string }) => useUrlMetadata(url),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </LiveblocksProvider>
        ),
        initialProps: { url: url1 },
      }
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        metadata: metadata1,
      })
    );

    // Change to URL 2
    rerender({ url: url2 });
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        metadata: metadata2,
      })
    );

    // Change back to URL 1 - should use cached data without suspending
    rerender({ url: url1 });

    expect(result.current).toEqual({
      isLoading: false,
      metadata: metadata1,
    });

    unmount();
  });
});
