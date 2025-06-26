import type {
  Awaitable,
  BaseUserMeta,
  DU,
  ResolveUsersArgs,
} from "@liveblocks/core";
import { Promise_withResolvers, warnOnceIf } from "@liveblocks/core";

type ResolveUserOptionalPromise<U extends BaseUserMeta> = (
  args: ResolveUsersArgs
) => Awaitable<(U["info"] | undefined)[] | undefined>;

/**
 * Batch calls to `resolveUsers` to one and only call.
 * It will avoid any performances issues and invocation timeouts on our customers' webhook handlers.
 *
 * This batch call will stack pending promises referring to `resolveUsers` in a map, resolve all users given in args at once
 * and then resolve pending promises all at once.
 */
class BatchUsersResolver<U extends BaseUserMeta> {
  private isResolved: boolean;
  private markAsResolved: () => void;
  private resolvePromise: Promise<void>;

  private primeResolveUsersFn: ResolveUserOptionalPromise<U> | undefined;
  private usersById: Map<string, U["info"] | undefined>;

  constructor(resolveUsers: ResolveUserOptionalPromise<U> | undefined) {
    const { promise, resolve } = Promise_withResolvers<void>();

    this.isResolved = false;
    this.markAsResolved = resolve;
    this.resolvePromise = promise;

    this.primeResolveUsersFn = resolveUsers;
    this.usersById = new Map();
  }

  resolveUsers = async (
    args: ResolveUsersArgs
  ): Promise<(U["info"] | undefined)[] | undefined> => {
    if (this.isResolved) {
      throw new Error("resolveUsers was already invoked once.");
    }

    // Note: register all user Ids
    for (const userId of args.userIds) {
      this.usersById.set(userId, undefined);
    }

    // Note: waiting until the batch promise is resolved
    await this.resolvePromise;

    // Note: once the batch promise is resolved
    // we can return safely resolved users
    return args.userIds.map((userId) => this.usersById.get(userId));
  };

  async resolve(): Promise<void> {
    if (this.isResolved) {
      return;
    }

    // Note: set an array of unique user ids
    const userIds = Array.from(this.usersById.keys());
    const users = await this.primeResolveUsersFn?.({ userIds });

    for (const [index, userId] of userIds.entries()) {
      const user = users?.[index];
      this.usersById.set(userId, user);
    }

    this.isResolved = true;
    this.markAsResolved();
  }
}

export type CreateBatchUsersResolverReturnType<U extends BaseUserMeta> = {
  resolveUsers: (
    args: ResolveUsersArgs
  ) => Promise<(U["info"] | undefined)[] | undefined>;
  resolve: () => Promise<void>;
};

export function createBatchUsersResolver<U extends BaseUserMeta = DU>({
  resolveUsers,
  callerName,
}: {
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
  callerName: string;
}): CreateBatchUsersResolverReturnType<U> {
  const batchUsersResolver = new BatchUsersResolver(resolveUsers);

  const resolve = async (): Promise<void> => {
    warnOnceIf(
      !resolveUsers,
      `Set "resolveUsers" in "${callerName}" to specify users info`
    );

    await batchUsersResolver.resolve();
  };

  return {
    resolveUsers: batchUsersResolver.resolveUsers,
    resolve,
  } as const;
}
