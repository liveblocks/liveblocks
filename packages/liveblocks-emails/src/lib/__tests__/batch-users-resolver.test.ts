import type {
  BaseUserMeta,
  DU,
  IUserInfo,
  OptionalPromise,
  ResolveUsersArgs,
} from "@liveblocks/core";

import { createBatchUsersResolver } from "../batch-users-resolver";

const USERS_DB: IUserInfo[] = [
  {
    id: "user-0",
    name: "Charlie Layne",
  },
  {
    id: "user-1",
    name: "Mislav Abha",
  },
  {
    id: "user-2",
    name: "Tatum Paolo",
  },
  {
    id: "user-3",
    name: "Anjali Wanda",
  },
];

describe("batch users resolve", () => {
  let resolveUsersMock: jest.Mock;
  beforeEach(() => {
    resolveUsersMock = jest.fn(
      <U extends BaseUserMeta = DU>({
        userIds,
      }: ResolveUsersArgs): OptionalPromise<
        (U["info"] | undefined)[] | undefined
      > => {
        const users: (U["info"] | undefined)[] = [];

        for (const userId of userIds) {
          const user = USERS_DB.find((u) => u.id === userId);
          if (user) {
            users.push(user);
          }
        }

        return users;
      }
    );
  });

  it("should register and resolve users info", async () => {
    const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
      resolveUsers: resolveUsersMock,
      callerName: "test-suite",
    });
    const userIds = ["user-0", "user-1", "user-2"];
    const registeredPromises = userIds.map((id) =>
      batchUsersResolver.registerResolveUsers({ userIds: [id] })
    );

    await batchUsersResolver.resolve();

    const resolvedUsers = await Promise.all(registeredPromises);
    const expected = [
      [{ id: "user-0", name: "Charlie Layne" }],
      [{ id: "user-1", name: "Mislav Abha" }],
      [{ id: "user-2", name: "Tatum Paolo" }],
    ];

    expect(resolvedUsers).toEqual(expected);
    expect(resolveUsersMock).toHaveBeenCalledTimes(1);
    expect(resolveUsersMock).toHaveBeenCalledWith({ userIds });
  });
});
