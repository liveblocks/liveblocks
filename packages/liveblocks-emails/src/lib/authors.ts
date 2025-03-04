import type {
  Awaitable,
  BaseUserMeta,
  ResolveUsersArgs,
} from "@liveblocks/core";

/** @internal */
export const resolveAuthorsInfo = async <U extends BaseUserMeta>({
  userIds,
  resolveUsers,
}: {
  userIds: string[];
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
}): Promise<Map<string, U["info"]>> => {
  const resolvedUsers = new Map<string, U["info"]>();
  if (!resolveUsers) {
    return resolvedUsers;
  }

  const users = await resolveUsers({ userIds });
  for (const [index, userId] of userIds.entries()) {
    const user = users?.[index];
    if (user) {
      resolvedUsers.set(userId, user);
    }
  }

  return resolvedUsers;
};
