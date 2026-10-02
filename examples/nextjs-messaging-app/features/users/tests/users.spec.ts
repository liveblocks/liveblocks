import { expect, test } from "@playwright/test";
import {
  CHARLIE,
  MISLAV,
  TATUM,
  USERS,
  demoAccountButton,
  dmRow,
  openApp,
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

  test("switching user from the rail signs in as someone else", async ({
    page,
  }) => {
    await openSignIn(page, { exampleId: uniqueExampleId() });
    await signInAs(page, CHARLIE);

    await userMenuButton(page, CHARLIE).click();
    await page.getByRole("option", { name: MISLAV.name }).click();

    await expect(userMenuButton(page, MISLAV)).toBeVisible();
    await expect(dmRow(page, CHARLIE)).toBeVisible();

    await page.reload();
    await expect(userMenuButton(page, MISLAV)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("signing out returns to the sign-in screen", async ({ page }) => {
    await openSignIn(page, { exampleId: uniqueExampleId() });
    await signInAs(page, CHARLIE);

    await userMenuButton(page, CHARLIE).click();
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(signInHeading(page)).toBeVisible();

    await page.reload();
    await expect(signInHeading(page)).toBeVisible({ timeout: 30_000 });
  });

  test("gallery previews skip sign-in and cannot sign out", async ({
    page,
  }) => {
    await openApp(page, { exampleId: uniqueExampleId(), user: TATUM });

    await expect(userMenuButton(page, TATUM)).toBeVisible();
    await userMenuButton(page, TATUM).click();
    await expect(
      page.getByRole("option", { name: CHARLIE.name })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
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
});
