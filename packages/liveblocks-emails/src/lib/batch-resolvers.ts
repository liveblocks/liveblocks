import type {
  Awaitable,
  BaseUserMeta,
  DGI,
  DU,
  ResolveGroupsInfoArgs,
  ResolveUsersArgs,
} from "@liveblocks/core";
import { Promise_withResolvers, warnOnce } from "@liveblocks/core";

/**
 * Utility to get the resolved result coming from a batch resolver for a given ID.
 */
export function getResolvedForId<T>(
  id: string,
  ids: string[],
  results: T[] | undefined
): T | undefined {
  const index = ids.indexOf(id);

  return results?.[index];
}

/**
 * Batch calls to a resolver callback (which expects an array of IDs
 * and returns an array of results) into a single call.
 */
export class BatchResolver<T> {
  private ids = new Set<string>();
  private results = new Map<string, T | undefined>();
  private isResolved = false;
  private promise: Promise<void>;
  private resolvePromise: () => void;
  private missingCallbackWarning: string;
  private callback?: (
    ids: string[]
  ) => Awaitable<(T | undefined)[] | undefined>;

  constructor(
    callback:
      | ((ids: string[]) => Awaitable<(T | undefined)[] | undefined>)
      | undefined,
    missingCallbackWarning: string
  ) {
    this.callback = callback;

    const { promise, resolve } = Promise_withResolvers<void>();
    this.promise = promise;
    this.resolvePromise = resolve;
    this.missingCallbackWarning = missingCallbackWarning;
  }

  /**
   * Add IDs to the batch and return a promise that resolves when the entire batch is resolved.
   * It can't be called after the batch is resolved.
   */
  async get(ids: string[]): Promise<(T | undefined)[] | undefined> {
    if (this.isResolved) {
      throw new Error("Batch has already been resolved.");
    }

    ids.forEach((id) => this.ids.add(id));

    // Wait for the batch to be resolved
    await this.promise;

    return ids.map((id) => this.results.get(id));
  }

  #resolveBatch() {
    this.isResolved = true;
    this.resolvePromise();
  }

  /**
   * Resolve all the IDs in the batch.
   * It can only be called once.
   */
  async resolve(): Promise<void> {
    if (this.isResolved) {
      throw new Error("Batch has already been resolved.");
    }

    if (!this.callback) {
      // Warn about the missing callback and resolve the batch early
      warnOnce(this.missingCallbackWarning);
      this.#resolveBatch();

      return;
    }

    const ids = Array.from(this.ids);

    // Call the callback once with all IDs
    try {
      const results = this.callback ? await this.callback(ids) : undefined;

      if (results !== undefined) {
        if (!Array.isArray(results)) {
          throw new Error("Callback must return an array.");
        } else if (ids.length !== results.length) {
          throw new Error(
            `Callback must return an array of the same length as the number of provided items. Expected ${ids.length}, but got ${results.length}.`
          );
        }
      }

      ids.forEach((id, index) => {
        this.results.set(id, results?.[index]);
      });
    } catch (error) {
      // Still mark as resolved to prevent reuse
      this.#resolveBatch();

      throw error;
    }

    this.#resolveBatch();
  }
}

export function createBatchUsersResolver<U extends BaseUserMeta = DU>({
  resolveUsers,
  callerName,
}: {
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
  callerName: string;
}): BatchResolver<U["info"]> {
  return new BatchResolver<U["info"]>(
    resolveUsers ? (userIds) => resolveUsers({ userIds }) : undefined,
    `Set "resolveUsers" in "${callerName}" to specify users info`
  );
}

export function createBatchGroupsInfoResolver({
  resolveGroupsInfo,
  callerName,
}: {
  resolveGroupsInfo?: (
    args: ResolveGroupsInfoArgs
  ) => Awaitable<(DGI | undefined)[] | undefined>;
  callerName: string;
}): BatchResolver<DGI> {
  return new BatchResolver<DGI>(
    resolveGroupsInfo
      ? (groupIds) => resolveGroupsInfo({ groupIds })
      : undefined,
    `Set "resolveGroupsInfo" in "${callerName}" to specify groups info`
  );
}
