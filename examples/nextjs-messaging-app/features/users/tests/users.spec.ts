import { expect, test } from "@playwright/test";
import {
  CHARLIE,
  MISLAV,
  TATUM,
  USERS,
  demoAccountButton,
  dmHeaderStatus,
  dmRow,
  openAccountMenu,
  openApp,
  openAppAs,
  openDm,
  openSignIn,
  signInAs,
  signInHeading,
  uniqueExampleId,
  userMenuButton,
} from "@/tests/helpers/e2e";

test.describe("users", () => {
  test("asks you to sign in when there is no session", async ({ page }) => {
    await openSignIn(page, { exampleId: uniqueExampleId() });

    for (const user of USERS) {
      await expect(demoAccountButton(page, user)).toBeVisible();
    }
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("signs in as a demo user and keeps the session across reloads", async ({
    page,
  }) => {
    const exampleId = uniqueExampleId();
    await openSignIn(page, { exampleId });
    await signInAs(page, MISLAV);

    await expect(dmRow(page, CHARLIE)).toBeVisible();
    await expect(dmRow(page, MISLAV)).toHaveCount(0);

    await page.reload();
    await expect(userMenuButton(page, MISLAV)).toBeVisible({
      timeout: 30_000,
    });
    await expect(signInHeading(page)).toHaveCount(0);
  });

  test("the session is a cookie, not browser storage", async ({ page }) => {
    const exampleId = uniqueExampleId();
    await openSignIn(page, { exampleId });
    await signInAs(page, TATUM);

    const cookies = await page.context().cookies();
    expect(
      cookies.some((cookie) => cookie.name.includes("session_token"))
    ).toBe(true);
    const storedUser = await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.endsWith(":user"))
    );
    expect(storedUser).toEqual([]);

    await page.context().clearCookies();
    await page.reload();
    await expect(signInHeading(page)).toBeVisible({ timeout: 30_000 });
  });

  test("signing out returns to the sign-in screen", async ({ page }) => {
    await openSignIn(page, { exampleId: uniqueExampleId() });
    await signInAs(page, CHARLIE);

    const menu = await openAccountMenu(page, CHARLIE);
    await menu.getByRole("button", { name: "Sign out" }).click();

    await expect(signInHeading(page)).toBeVisible();

    await page.reload();
    await expect(signInHeading(page)).toBeVisible({ timeout: 30_000 });
  });

  test("gallery previews skip sign-in and cannot sign out", async ({
    page,
  }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: TATUM });

    const menu = await openAccountMenu(page, TATUM);
    await expect(
      menu.getByRole("button", { name: "Set yourself as away" })
    ).toBeVisible();
    await expect(menu.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("two browsers keep separate sessions", async ({ browser }) => {
    const exampleId = uniqueExampleId();
    const first = await browser.newContext();
    const second = await browser.newContext();
    const firstPage = await first.newPage();
    const secondPage = await second.newPage();

    await openSignIn(firstPage, { exampleId });
    await signInAs(firstPage, CHARLIE);
    await openSignIn(secondPage, { exampleId });
    await signInAs(secondPage, MISLAV);

    await expect(userMenuButton(firstPage, CHARLIE)).toBeVisible();
    await expect(userMenuButton(secondPage, MISLAV)).toBeVisible();

    await first.close();
    await second.close();
  });

  test("status and away state are shared with other users and survive reloads", async ({
    page,
    browser,
  }) => {
    const exampleId = uniqueExampleId();
    await openApp(page, { exampleId, user: CHARLIE });

    const other = await openAppAs(browser, { exampleId, user: MISLAV });
    try {
      await openDm(other.page, CHARLIE);
      await expect(dmHeaderStatus(other.page, CHARLIE)).toContainText("Online");

      const menu = await openAccountMenu(page, CHARLIE);
      await expect(menu.getByRole("button", { name: "Sign out" })).toHaveCount(
        0
      );
      await menu.getByRole("button", { name: "Add an emoji" }).click();
      await page.locator("button", { hasText: "😀" }).first().click();
      const statusInput = menu.getByRole("textbox", { name: "Status" });
      await statusInput.fill("Heads down");
      await statusInput.press("Enter");
      await expect(menu).toBeHidden();
      await expect(userMenuButton(page, CHARLIE)).toContainText("😀");

      const awayMenu = await openAccountMenu(page, CHARLIE);
      await awayMenu
        .getByRole("button", { name: "Set yourself as away" })
        .click();
      await expect(
        awayMenu.getByRole("button", { name: "Set yourself as online" })
      ).toBeVisible();
      await expect(awayMenu.getByText("Away", { exact: true })).toBeVisible();

      await expect(dmHeaderStatus(other.page, CHARLIE)).toContainText("Away");
      await expect(dmHeaderStatus(other.page, CHARLIE)).toContainText(
        "Heads down"
      );
      await expect(dmRow(other.page, CHARLIE)).toContainText("😀");

      await page.reload();
      await expect(userMenuButton(page, CHARLIE)).toBeVisible({
        timeout: 30_000,
      });
      await expect(dmHeaderStatus(other.page, CHARLIE)).toContainText("Away");

      const reopened = await openAccountMenu(page, CHARLIE);
      await reopened
        .getByRole("button", { name: "Set yourself as online" })
        .click();
      await expect(dmHeaderStatus(other.page, CHARLIE)).toContainText("Online");

      await reopened.getByRole("button", { name: "Clear status" }).click();
      await expect(dmHeaderStatus(other.page, CHARLIE)).not.toContainText(
        "Heads down"
      );
    } finally {
      await other.context.close();
    }
  });
});
