import type {
  Awaitable,
  BaseUserMeta,
  DU,
  IUserInfo,
  ResolveUsersArgs,
} from "@liveblocks/core";
import { vi } from "vitest";

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
  let resolveUsersMock: ReturnType<typeof vi.fn>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    resolveUsersMock = vi.fn(
      <U extends BaseUserMeta = DU>({
        userIds,
      }: ResolveUsersArgs): Awaitable<
        (U["info"] | undefined)[] | undefined
      > => {
        const users: (U["info"] | undefined)[] = [];

        for (const userId of userIds) {
          const user = USERS_DB.find((u) => u.id === userId);
          if (user) {
            users.push({ name: user.name });
          }
        }

        return users;
      }
    );
  });

  it("should handle no `resolveUsers` callback", async () => {
    const warnMock1 = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(warnMock1);

    const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
      callerName: "test-suite-0",
    });
    const userIds = ["user-0", "user-1", "user-2"];

    const resolveUsersPromises = userIds.map((id) =>
      batchUsersResolver.resolveUsers({ userIds: [id] })
    );

    await batchUsersResolver.resolve();

    const resolvedUsers = await Promise.all(resolveUsersPromises);
    const expected = [[undefined], [undefined], [undefined]];

    expect(resolvedUsers).toEqual(expected);
    expect(warnMock1).toHaveBeenCalledWith(
      'Set "resolveUsers" option in "test-suite-0" to specify users info'
    );

    warnMock1.mockRestore();
  });

  it("should resolve users info all at once", async () => {
    const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
      resolveUsers: resolveUsersMock,
      callerName: "test-suite-1",
    });
    const userIds = ["user-0", "user-1", "user-2"];
    const resolveUsersPromises = userIds.map((id) =>
      batchUsersResolver.resolveUsers({ userIds: [id] })
    );

    await batchUsersResolver.resolve();

    const resolvedUsers = await Promise.all(resolveUsersPromises);
    const expected = [
      [{ name: "Charlie Layne" }],
      [{ name: "Mislav Abha" }],
      [{ name: "Tatum Paolo" }],
    ];

    expect(resolvedUsers).toEqual(expected);
    expect(resolveUsersMock).toHaveBeenCalledTimes(1);
    expect(resolveUsersMock).toHaveBeenCalledWith({ userIds });
  });

  it("should resolve the same user in one call with multiple resolveUsers promises", async () => {
    const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
      resolveUsers: resolveUsersMock,
      callerName: "test-suite-2",
    });

    const userId = "user-3";

    const promise1 = batchUsersResolver.resolveUsers({ userIds: [userId] });
    const promise2 = batchUsersResolver.resolveUsers({ userIds: [userId] });

    await batchUsersResolver.resolve();

    const resolvedUser1 = await promise1;
    const resolvedUser2 = await promise2;

    const expected = [{ name: "Anjali Wanda" }];
    expect(resolvedUser1).toEqual(expected);
    expect(resolvedUser2).toEqual(expected);
  });

  it("should warn if batch promise is already resolved", async () => {
    const warnMock2 = vi.spyOn(console, "warn").mockImplementation(() => {});

    const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
      resolveUsers: resolveUsersMock,
      callerName: "test-suite-3",
    });

    const promise1 = batchUsersResolver.resolveUsers({ userIds: ["user-0"] });

    await batchUsersResolver.resolve();
    const resolvedUser1 = await promise1;

    const promise2 = batchUsersResolver.resolveUsers({ userIds: ["user-1"] });

    await batchUsersResolver.resolve();
    const resolvedUser2 = await promise2;

    expect(warnMock2).toHaveBeenCalledTimes(2);
    expect(warnMock2).toHaveBeenCalledWith(
      "Batch users resolver promise already resolved. It can only resolve once."
    );
    expect(resolvedUser1).toEqual([{ name: "Charlie Layne" }]);
    expect(resolvedUser2).toBeUndefined();

    warnMock2.mockRestore();
  });
});
