import type {
  BaseUserMeta,
  DU,
  OptionalPromise,
  ResolveUsersArgs,
} from "@liveblocks/core";

/**
 * Emit a warning only once if a condition is met, in development only.
 */
const createDevelopmentWarning = (
  condition: boolean | (() => boolean),
  ...args: Parameters<typeof console.warn>
) => {
  let hasWarned = false;

  if (process.env.NODE_ENV !== "production") {
    return () => {
      if (
        !hasWarned &&
        (typeof condition === "function" ? condition() : condition)
      ) {
        console.warn(...args);

        hasWarned = true;
      }
    };
  } else {
    return () => {};
  }
};

const getCacheKey = (): string => "";

type ResolveUserFunction<U extends BaseUserMeta> = (
  args: ResolveUsersArgs
) => OptionalPromise<(U["info"] | undefined)[] | undefined>;

class BatchUsersResolver<U extends BaseUserMeta> {
  private resolveUsers: ResolveUserFunction<U> | undefined;
  private resolvers: Map<string, ResolveUserFunction<U>>;

  constructor(resolveUsers: ResolveUserFunction<U> | undefined) {
    this.resolveUsers = resolveUsers;
    this.resolvers = new Map();
  }

  async resolve(): Promise<void> {}
}

export type CreateBatchUsersResolverReturnType<U extends BaseUserMeta> = {
  resolve: () => Promise<void>;
};

export function createBatchUsersResolver<U extends BaseUserMeta = DU>({
  resolveUsers,
  callerFnName,
}: {
  resolveUsers?: ResolveUserFunction<U>;
  callerFnName: string;
}): CreateBatchUsersResolverReturnType<U> {
  const warnIfNoResolveUsers = createDevelopmentWarning(
    () => !resolveUsers,
    `Set "resolverUsers" in ${callerFnName} options to specify users info`
  );
  const batchUsersResolver = new BatchUsersResolver(resolveUsers);

  const resolve = async (): Promise<void> => {
    try {
      warnIfNoResolveUsers();
      await batchUsersResolver.resolve();
    } catch (err) {
      console.error("error while batch resolving users", err);
      throw err;
    }
  };

  return { resolve } as const;
}

/*
 * const batchResolver = batchResolveUsers(resolveUsers);
 * const commentBodyPromises = commentBodies.map(
 *  body => stringifyCommentBody(body, { resolveUsers: batchResolver.get })
 * );
 * batchResolver.resolve();
 * const commentBodies = await Promise.all(commentBodyPromises);
 */
