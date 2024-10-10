import { PaginatedResource } from "../umbrella-store";

function makeFetcher() {
  return jest
    .fn<Promise<string | null>, [cursor?: string]>()
    .mockImplementation((cursor?: string) => {
      const nextCursor =
        cursor === undefined ? "two" : cursor === "two" ? "three" : null;
      return Promise.resolve(nextCursor);
    });
}

function makeUnreliableFetcher() {
  let i = 0;
  return (
    jest
      .fn<Promise<string | null>, [cursor?: string]>()
      // VINCENT - There is a bug that shows up when we remove the "async" below here! It's an edge case we'll need to handle!
      .mockImplementation(async (cursor?: string) => {
        if (++i % 2 === 0) {
          throw new Error("Crap");
        }

        const nextCursor =
          cursor === undefined ? "two" : cursor === "two" ? "three" : null;
        return Promise.resolve(nextCursor);
      })
  );
}

function makeBrokenFetcher() {
  return (
    jest
      .fn<Promise<string | null>, [cursor?: string]>()
      // VINCENT - There is a bug that shows up when we remove the "async" below here! It's an edge case we'll need to handle!
      // eslint-disable-next-line @typescript-eslint/require-await
      .mockImplementation(async () => {
        throw new Error("Crap");
      })
  );
}

describe("PaginatedResource", () => {
  test("Defaults to loading state", () => {
    const fetcher = makeFetcher();
    const p = new PaginatedResource(fetcher);
    expect(p.get()).toEqual({ isLoading: true });
    expect(fetcher).not.toBeCalled();
  });

  test("Getting loading state is always referrentially equal", () => {
    const fetcher = makeFetcher();
    const p = new PaginatedResource(fetcher);
    expect(p.get()).toEqual({ isLoading: true });
    expect(p.get() === p.get()).toEqual(true);
  });

  test("Fetching more - happy path", async () => {
    const fetcher = makeFetcher();
    const p = new PaginatedResource(fetcher);
    expect(p.get()).toEqual({ isLoading: true });

    // Kick the fetcher off
    await p.waitUntilLoaded();

    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMore: expect.any(Function),
      },
    });

    // TODO It would be nice if the exact same object reference every time
    // expect(p.get() === p.get()).toEqual(true);

    expect(fetcher).toHaveBeenNthCalledWith(1, /* cursor */ undefined);

    const fetchMore = p.get().data!.fetchMore as () => Promise<void>;
    //                                                 ^^^^^^^
    // NOTE: fetchMore really *is* a promise at runtime, but we don't
    // expose it as such publicly.

    // Synchronously calling fetch more multiple times has no effect
    fetchMore();
    fetchMore();
    fetchMore();
    const f$ = fetchMore();

    // In fact, it will be the exact same promise
    expect(fetchMore() === fetchMore()).toEqual(true);

    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: true,
        hasFetchedAll: false,
        fetchMore: expect.any(Function),
      },
    });

    // TODO It would be nice if the exact same object reference every time
    // expect(p.get() === p.get()).toEqual(true);

    await f$;

    expect(fetcher).toHaveBeenNthCalledWith(2, "two");
    expect(fetcher).toBeCalledTimes(2);

    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMore: expect.any(Function),
      },
    });

    // TODO It would be nice if the exact same object reference every time
    // expect(p.get() === p.get()).toEqual(true);

    await fetchMore();

    expect(fetcher).toHaveBeenNthCalledWith(3, "three");
    expect(fetcher).toBeCalledTimes(3);

    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMore: expect.any(Function),
      },
    });

    // TODO It would be nice if the exact same object reference every time
    // expect(p.get() === p.get()).toEqual(true);
  });

  test("Fetching more - non-happy path, with unreliable fetcher", async () => {
    const unreliableFetcher = makeUnreliableFetcher();
    const p = new PaginatedResource(unreliableFetcher);
    expect(p.get()).toEqual({ isLoading: true });

    // Kick the fetcher off
    await p.waitUntilLoaded();

    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMore: expect.any(Function),
      },
    });

    // TODO It would be nice if the exact same object reference every time
    // expect(p.get() === p.get()).toEqual(true);

    expect(unreliableFetcher).toHaveBeenNthCalledWith(
      1,
      /* cursor */ undefined
    );

    // The next fetch will fail
    const fetchMore = p.get().data!.fetchMore as () => Promise<void>;
    //                                                 ^^^^^^^
    // NOTE: fetchMore really *is* a promise at runtime, but we don't

    const f1$ = fetchMore(); // Will fail!

    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: true,
        hasFetchedAll: false,
        fetchMore: expect.any(Function),
      },
    });

    // TODO It would be nice if the exact same object reference every time
    // expect(p.get() === p.get()).toEqual(true);

    await f1$; // Should have failed!

    expect(unreliableFetcher).toHaveBeenNthCalledWith(2, "two");
    expect(unreliableFetcher).toBeCalledTimes(2);
    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: false,
        fetchMoreError: expect.any(Error),
        hasFetchedAll: false,
        fetchMore: expect.any(Function),
      },
    });

    // TODO It would be nice if the exact same object reference every time
    // expect(p.get() === p.get()).toEqual(true);

    // Fetch once more
    const f2$ = fetchMore(); // Will succeed!

    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: true,
        fetchMoreError: expect.any(Error),
        hasFetchedAll: false,
        fetchMore: expect.any(Function),
      },
    });

    await f2$; // Should have succeeded!

    expect(unreliableFetcher).toHaveBeenNthCalledWith(3, "two");
    expect(unreliableFetcher).toBeCalledTimes(3);

    expect(p.get()).toEqual({
      isLoading: false,
      data: {
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMore: expect.any(Function),
      },
    });

    // TODO It would be nice if the exact same object reference every time
    // expect(p.get() === p.get()).toEqual(true);
  });

  test("Worst-case path, with completely broken fetcher, even the initial fetch will fail", async () => {
    const brokenFetcher = makeBrokenFetcher();
    const p = new PaginatedResource(brokenFetcher);
    expect(p.get()).toEqual({ isLoading: true });

    jest.useFakeTimers();
    try {
      // Kick the fetcher off
      const w$ = p.waitUntilLoaded();

      expect(brokenFetcher).toHaveBeenCalledTimes(1);
      expect(p.get()).toEqual({ isLoading: true });

      await jest.advanceTimersByTimeAsync(5_000);
      expect(brokenFetcher).toHaveBeenCalledTimes(2);
      expect(p.get()).toEqual({ isLoading: true });

      await jest.advanceTimersByTimeAsync(5_000);
      expect(brokenFetcher).toHaveBeenCalledTimes(3);
      expect(p.get()).toEqual({ isLoading: true });

      await jest.advanceTimersByTimeAsync(10_000);
      expect(brokenFetcher).toHaveBeenCalledTimes(4);
      expect(p.get()).toEqual({ isLoading: true });

      await jest.advanceTimersByTimeAsync(15_000);
      expect(brokenFetcher).toHaveBeenCalledTimes(5);
      expect(p.get()).toEqual({
        isLoading: false,
        error: expect.any(Error),
      });

      // Awaiting the outer promise will eventually reject
      await expect(w$).rejects.toThrow("Failed after 5 attempts: Error: Crap");

      // TODO It would be nice if the exact same object reference every time
      // expect(p.get() === p.get()).toEqual(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
