import {
  type BaseUserMeta,
  type DU,
  type OptionalPromise,
  type ResolveUsersArgs,
  stringify,
} from "@liveblocks/core";

/**
 * @internal
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

const getMapKey = (args: ResolveUsersArgs): string => stringify(args);

type ResolveUserOptionalPromise<U extends BaseUserMeta> = (
  args: ResolveUsersArgs
) => OptionalPromise<(U["info"] | undefined)[] | undefined>;

type BatchUsersResolverCall<U extends BaseUserMeta> = {
  args: ResolveUsersArgs;
  promise: OptionalPromise<(U["info"] | undefined)[] | undefined>;
  resolve: (
    value: OptionalPromise<(U["info"] | undefined)[] | undefined>
  ) => void;
};

class BatchUsersResolver<U extends BaseUserMeta> {
  private resolveUsers: ResolveUserOptionalPromise<U> | undefined;
  private resolveUsersPromises: Map<string, BatchUsersResolverCall<U>>;

  constructor(resolveUsers: ResolveUserOptionalPromise<U> | undefined) {
    this.resolveUsers = resolveUsers;
    this.resolveUsersPromises = new Map();
  }

  register = (
    args: ResolveUsersArgs
  ): OptionalPromise<(U["info"] | undefined)[] | undefined> => {
    const key = getMapKey(args);
    const existingPromise = this.resolveUsersPromises.get(key);
    if (existingPromise) {
      return existingPromise.promise;
    }

    let resolveFn: (
      value: OptionalPromise<(U["info"] | undefined)[] | undefined>
    ) => void = (): void => {};

    const promise = new Promise<(U["info"] | undefined)[] | undefined>(
      (resolve) => {
        resolveFn = resolve;
      }
    );

    this.resolveUsersPromises.set(key, { args, promise, resolve: resolveFn });

    return promise;
  };

  async resolve(): Promise<void> {
    const userIds = Array.from(
      new Set(
        Array.from(this.resolveUsersPromises.values()).flatMap(
          (entry) => entry.args.userIds
        )
      )
    );

    const users = await this.resolveUsers?.({ userIds });

    const usersMap = new Map<string, U["info"] | undefined>();
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      if (userId) {
        usersMap.set(userId, users?.[i] ?? undefined);
      }
    }

    for (const { args, resolve } of this.resolveUsersPromises.values()) {
      const resolvedUsers = args.userIds.map((userId) => usersMap.get(userId));
      resolve(resolvedUsers);
    }
  }
}

export type CreateBatchUsersResolverReturnType<U extends BaseUserMeta> = {
  registerResolveUsers: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
  resolve: () => Promise<void>;
};

export function createBatchUsersResolver<U extends BaseUserMeta = DU>({
  resolveUsers,
  callerName,
}: {
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
  callerName: string;
}): CreateBatchUsersResolverReturnType<U> {
  const warnIfNoResolveUsers = createDevelopmentWarning(
    () => !resolveUsers,
    `Set "resolverUsers" in ${callerName} options to specify users info`
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

  return {
    resolve,
    registerResolveUsers: batchUsersResolver.register,
  } as const;
}
