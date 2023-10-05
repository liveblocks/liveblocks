import { chromium, expect, Page } from "@playwright/test";
import _ from "lodash";
import { randomInt } from "../utils";
import type { Json } from "@liveblocks/client";

export type IDSelector = `#${string}`;

const WIDTH = 640;
const HEIGHT = 800;

export async function preparePage(url: string, windowPositionX: number = 0) {
  let page: Page;
  const browser = await chromium.launch({
    args: [
      `--no-sandbox`,
      `--disable-setuid-sandbox`,
      `--window-size=${WIDTH},${HEIGHT}`,
      `--window-position=${windowPositionX},0`,
      "--disable-dev-shm-usage",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 640, height: 800 },
  });
  page = await context.newPage();
  await page.goto(url);

  return page;
}

export async function preparePages(url: string) {
  const firstUrl = new URL(url);
  const secondUrl = new URL(url);
  firstUrl.searchParams.set("bg", "#cafbca");
  secondUrl.searchParams.set("bg", "#e9ddf9");
  return Promise.all([
    preparePage(firstUrl.toString(), 0),
    preparePage(secondUrl.toString(), WIDTH),
  ] as const);
}

export async function waitForJson(
  oneOrMorePages: Page | Page[],
  selector: IDSelector,
  expectedValue: Json
) {
  const pages = Array.isArray(oneOrMorePages)
    ? oneOrMorePages
    : [oneOrMorePages];

  const expectedText = JSON.stringify(expectedValue, null, 2);
  return Promise.all(
    pages.map((page) =>
      expect(page.locator(selector)).toHaveText(expectedText, { timeout: 5000 })
    )
  );
}

export async function expectJson(
  page: Page,
  selector: IDSelector,
  expectedValue: Json | undefined
) {
  if (expectedValue !== undefined) {
    await expect(getJson(page, selector)).resolves.toEqual(expectedValue);
  } else {
    const text = page.locator(selector).innerText();
    await expect(text).toEqual("undefined");
  }
}

export async function getJson(page: Page, selector: IDSelector): Promise<Json> {
  const text = await page.locator(selector).innerText();
  if (!text) {
    throw new Error(`Could not find HTML element #${selector}`);
  }
  return JSON.parse(text);
}

async function getBoth(pages: [Page, Page], selector: IDSelector) {
  const [page1, page2] = pages;
  const value1 = await getJson(page1, selector);
  const value2 = await getJson(page2, selector);
  return [value1, value2];
}

export async function expectJsonEqualOnAllPages(
  pages: [Page, Page],
  selector: IDSelector
) {
  const [value1, value2] = await getBoth(pages, selector);
  expect(value1).toEqual(value2);
}

export async function waitUntilEqualOnAllPages(
  pages: [Page, Page],
  selector: IDSelector
) {
  for (let i = 0; i < 20; i++) {
    const [value1, value2] = await getBoth(pages, selector);
    if (_.isEqual(value1, value2)) {
      return; // Great, we're done!
    } else {
      await sleep(100);
    }
  }

  // We didn't find the values in sync, so call expectJsonEqualOnAllPages() so
  // it will fail the wait
  await expectJsonEqualOnAllPages(pages, selector);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep anywhere between 0 and 50 milliseconds.
 */
export function nanoSleep() {
  return sleep(randomInt(50));
}

export function pickFrom<T>(array: readonly T[]): T {
  if (array.length <= 0) {
    throw new Error("Cannot pick from an empty list");
  }
  return array[randomInt(array.length)];
}

export function pickNumberOfUndoRedo() {
  const undoRedoProb = randomInt(100);

  if (undoRedoProb > 75) {
    return randomInt(5);
  }

  return 0;
}
