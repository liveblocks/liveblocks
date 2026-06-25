import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { genRoomId, preparePage, waitForJson } from "../utils";

const TEST_URL = "http://localhost:3007/comments/visibility";
const SLOW = { timeout: 20_000 };
const VISIBILITY_PERMISSIONS = {
  public: ["*:read", "comments:none", "comments:public:write"],
  private: ["*:read", "comments:none", "comments:private:write"],
} satisfies Record<"public" | "private", readonly string[]>;
const PUBLIC_COMMENTS_WRITE_PRIVATE_NONE_PERMISSIONS: readonly string[] = [
  "*:read",
  "comments:write",
  "comments:private:none",
];
const BASE_WRITE_PERMISSIONS: readonly string[] = ["*:write"];
const BROAD_COMMENTS_WRITE_PERMISSIONS: readonly string[] = [
  "*:read",
  "comments:write",
];

test.describe("Thread visibility", () => {
  let pages: Page[] = [];

  test.afterEach(async () => {
    await Promise.all(
      pages
        .filter((page) => !page.isClosed())
        .map((page) => page.close())
    );
    pages = [];
  });

  test(
    "creates and fetches public and private thread visibility",
    async ({}, testInfo) => {
      const run = [
        Date.now().toString(36),
        testInfo.workerIndex,
        testInfo.retry,
        Math.random().toString(16).slice(2, 8),
      ].join("-");
      const room = getRoomId(testInfo, run, "all");

      const publicPage = await openPage({
        room,
        run,
        user: 1,
        visibility: "public",
        x: 0,
      });

      await waitForPageLoaded(publicPage);

      const publicThreadResponse$ = waitForCreateThreadResponse(publicPage);
      await publicPage.click("#create-thread");
      await publicThreadResponse$;
      await publicPage.close();

      const privatePage = await openPage({
        room,
        run,
        user: 2,
        visibility: "private",
        x: 640,
      });

      await waitForPageLoaded(privatePage);

      const privateThreadResponse$ = waitForCreateThreadResponse(privatePage);
      await privatePage.click("#create-thread");
      await privateThreadResponse$;
      await privatePage.close();

      const verifierPage = await openPage({
        room,
        run,
        user: 1,
        visibility: "all",
        x: 0,
      });

      await waitForPageLoaded(verifierPage);
      await waitForJson(verifierPage, "#threadCount", 2, SLOW);
      await waitForJson(verifierPage, "#publicThreadCount", 1, SLOW);
      await waitForJson(verifierPage, "#privateThreadCount", 1, SLOW);
      await waitForJson(
        verifierPage,
        "#threadVisibilities",
        ["private", "public"],
        SLOW
      );
      await verifierPage.close();
    }
  );

  test(
    "creates threads with matching visibility-specific permissions",
    async ({}, testInfo) => {
      const run = [
        Date.now().toString(36),
        testInfo.workerIndex,
        testInfo.retry,
        Math.random().toString(16).slice(2, 8),
      ].join("-");
      const publicRoom = getRoomId(testInfo, run, "public");
      const privateRoom = getRoomId(testInfo, run, "private");

      await createThreadWithVisibilityPermissions({
        room: publicRoom,
        run,
        user: 1,
        visibility: "public",
        x: 0,
      });
      await verifyPersistedVisibility({
        room: publicRoom,
        run,
        user: 1,
        visibility: "public",
        x: 0,
      });

      await createThreadWithVisibilityPermissions({
        room: privateRoom,
        run,
        user: 2,
        visibility: "private",
        x: 640,
      });
      await verifyPersistedVisibility({
        room: privateRoom,
        run,
        user: 2,
        visibility: "private",
        x: 640,
      });
    }
  );

  test(
    "inherits base and broad comments permissions for thread visibility",
    async ({}, testInfo) => {
      const run = [
        Date.now().toString(36),
        testInfo.workerIndex,
        testInfo.retry,
        Math.random().toString(16).slice(2, 8),
      ].join("-");
      const cases = [
        {
          id: "base-write-public",
          user: 1,
          visibility: "public",
          permissions: BASE_WRITE_PERMISSIONS,
          x: 0,
        },
        {
          id: "base-write-private",
          user: 1,
          visibility: "private",
          permissions: BASE_WRITE_PERMISSIONS,
          x: 640,
        },
        {
          id: "comments-write-public",
          user: 2,
          visibility: "public",
          permissions: BROAD_COMMENTS_WRITE_PERMISSIONS,
          x: 0,
        },
        {
          id: "comments-write-private",
          user: 2,
          visibility: "private",
          permissions: BROAD_COMMENTS_WRITE_PERMISSIONS,
          x: 640,
        },
      ] satisfies Array<{
        id: string;
        user: number;
        visibility: "public" | "private";
        permissions: readonly string[];
        x: number;
      }>;

      for (const testCase of cases) {
        const room = getRoomId(testInfo, run, testCase.id);

        await createThreadWithExplicitPermissions({
          room,
          run,
          user: testCase.user,
          visibility: testCase.visibility,
          permissions: testCase.permissions,
          x: testCase.x,
        });
        await verifyPersistedVisibility({
          room,
          run,
          user: testCase.user,
          visibility: testCase.visibility,
          x: testCase.x,
        });
      }
    }
  );

  test(
    "rejects threads created with mismatched visibility-specific permissions",
    async ({}, testInfo) => {
      const run = [
        Date.now().toString(36),
        testInfo.workerIndex,
        testInfo.retry,
        Math.random().toString(16).slice(2, 8),
      ].join("-");
      const room = getRoomId(testInfo, run, "mismatch");

      const page = await openPage({
        room,
        run,
        user: 1,
        visibility: "private",
        permissions: VISIBILITY_PERMISSIONS.public,
        mode: "create",
        x: 0,
      });

      await waitForCreatePageLoaded(page);
      await page.click("#create-thread");
      await waitForJson(page, "#errorContextType", "CREATE_THREAD_ERROR", SLOW);
      await expect(page.locator("#errorCause")).toContainText(
        /forbidden|permission|unauthorized|not allowed|403/i,
        SLOW
      );
      await page.close();

      const verifierPage = await openPage({
        room,
        run,
        user: 1,
        visibility: "all",
        x: 0,
      });

      await waitForPageLoaded(verifierPage);
      await waitForJson(verifierPage, "#threadCount", 0, SLOW);
      await verifierPage.close();
    }
  );

  test(
    "applies explicit permission tokens with a private visibility override",
    async ({}, testInfo) => {
      const run = [
        Date.now().toString(36),
        testInfo.workerIndex,
        testInfo.retry,
        Math.random().toString(16).slice(2, 8),
      ].join("-");
      const publicRoom = getRoomId(testInfo, run, "public");
      const privateRoom = getRoomId(testInfo, run, "private");

      await createThreadWithExplicitPermissions({
        room: publicRoom,
        run,
        user: 1,
        visibility: "public",
        permissions: PUBLIC_COMMENTS_WRITE_PRIVATE_NONE_PERMISSIONS,
        x: 0,
      });
      await verifyPersistedVisibility({
        room: publicRoom,
        run,
        user: 1,
        visibility: "public",
        x: 0,
      });

      const page = await openPage({
        room: privateRoom,
        run,
        user: 1,
        visibility: "private",
        permissions: PUBLIC_COMMENTS_WRITE_PRIVATE_NONE_PERMISSIONS,
        mode: "create",
        x: 0,
      });

      await waitForCreatePageLoaded(page);
      await page.click("#create-thread");
      await waitForJson(page, "#errorContextType", "CREATE_THREAD_ERROR", SLOW);
      await expect(page.locator("#errorCause")).toContainText(
        /forbidden|permission|unauthorized|not allowed|403/i,
        SLOW
      );
      await page.close();

      const verifierPage = await openPage({
        room: privateRoom,
        run,
        user: 1,
        visibility: "all",
        x: 0,
      });

      await waitForPageLoaded(verifierPage);
      await waitForJson(verifierPage, "#threadCount", 0, SLOW);
      await verifierPage.close();
    }
  );

  async function openPage({
    room,
    run,
    user,
    visibility,
    permissions,
    mode,
    x,
  }: {
    room: string;
    run: string;
    user: number;
    visibility: "all" | "public" | "private";
    permissions?: readonly string[];
    mode?: "read" | "create";
    x: number;
  }) {
    const page = await preparePage(
      getPageUrl({
        room,
        run,
        user,
        visibility,
        permissions,
        mode,
      }),
      { x }
    );
    pages.push(page);
    return page;
  }

  async function createThreadWithVisibilityPermissions({
    room,
    run,
    user,
    visibility,
    x,
  }: {
    room: string;
    run: string;
    user: number;
    visibility: "public" | "private";
    x: number;
  }) {
    const page = await openPage({
      room,
      run,
      user,
      visibility,
      permissions: VISIBILITY_PERMISSIONS[visibility],
      mode: "create",
      x,
    });

    await waitForCreatePageLoaded(page);

    const createThreadResponse$ = waitForCreateThreadResponse(page);
    await page.click("#create-thread");
    await createThreadResponse$;
    await page.close();
  }

  async function createThreadWithExplicitPermissions({
    room,
    run,
    user,
    visibility,
    permissions,
    x,
  }: {
    room: string;
    run: string;
    user: number;
    visibility: "public" | "private";
    permissions: readonly string[];
    x: number;
  }) {
    const page = await openPage({
      room,
      run,
      user,
      visibility,
      permissions,
      mode: "create",
      x,
    });

    await waitForCreatePageLoaded(page);

    const createThreadResponse$ = waitForCreateThreadResponse(page);
    await page.click("#create-thread");
    await createThreadResponse$;
    await page.close();
  }

  async function verifyPersistedVisibility({
    room,
    run,
    user,
    visibility,
    x,
  }: {
    room: string;
    run: string;
    user: number;
    visibility: "public" | "private";
    x: number;
  }) {
    const page = await openPage({
      room,
      run,
      user,
      visibility: "all",
      x,
    });

    await waitForPageLoaded(page);
    await waitForJson(page, "#threadCount", 1, SLOW);
    await waitForJson(
      page,
      visibility === "public" ? "#publicThreadCount" : "#privateThreadCount",
      1,
      SLOW
    );
    await waitForJson(page, "#threadVisibilities", [visibility], SLOW);
    await page.close();
  }
});

function getRoomId(testInfo: TestInfo, run: string, suffix: string) {
  return genRoomId(testInfo, `:${run}:${suffix}`);
}

function getPageUrl({
  room,
  run,
  user,
  visibility,
  permissions,
  mode,
}: {
  room: string;
  run: string;
  user: number;
  visibility: "all" | "public" | "private";
  permissions?: readonly string[];
  mode?: "read" | "create";
}) {
  const url = new URL(TEST_URL);
  url.searchParams.set("room", room);
  url.searchParams.set("run", run);
  url.searchParams.set("user", String(user));
  url.searchParams.set("visibility", visibility);
  for (const permission of permissions ?? []) {
    url.searchParams.append("permissions", permission);
  }
  if (mode !== undefined) {
    url.searchParams.set("mode", mode);
  }
  return url.toString();
}

async function waitForPageLoaded(page: Page) {
  await waitForJson(page, "#isLoading", false, SLOW);
  await waitForJson(page, "#error", undefined, SLOW);
}

async function waitForCreatePageLoaded(page: Page) {
  await waitForJson(page, "#error", undefined, SLOW);
  await expect(page.locator("#create-thread")).toBeVisible(SLOW);
}

async function waitForCreateThreadResponse(page: Page) {
  const response = await page.waitForResponse((candidate) => {
    if (candidate.request().method() !== "POST") {
      return false;
    }

    return new URL(candidate.url()).pathname.endsWith("/threads");
  }, SLOW);

  expect(response.ok()).toBe(true);
}
