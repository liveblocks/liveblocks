import { chromium, expect, Page } from "@playwright/test";
import _ from "lodash";
import { randomInt } from "../utils";
import type { Json } from "@liveblocks/client";

type IDSelector = `#${string}`;

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

export async function expectJsonEqualOnAllPages(
  pages: [Page, Page],
  selector: IDSelector
) {
  const [page1, ...otherPages] = pages;
  const value1 = await getJson(page1, selector);

  for (const page of otherPages) {
    const valueN = await getJson(page, selector);
    expect(value1).toEqual(valueN);
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep anywhere between 0 and 50 milliseconds.
 */
export function nanoSleep() {
  return sleep(randomInt(50));
}

export async function waitUntilEqualOnAllPages(
  pages: [Page, Page],
  selector: IDSelector
) {
  for (let i = 0; i < 20; i++) {
    try {
      await expectJsonEqualOnAllPages(pages, selector);
      return; // Great, we're done!
    } catch {
      await sleep(100);
    }
  }

  // Call it one last time expectJsonEqualOnAllPages(), but if it fails now,
  // we'll fail the wait too
  await expectJsonEqualOnAllPages(pages, selector);
}

export function pickFrom<T>(array: T[]): T {
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
