import { chromium, expect, Page } from "@playwright/test";
import _ from "lodash";
import randomNumber from "../utils/randomNumber";
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
  const firstPage = await preparePage(firstUrl.toString(), 0);
  const secondPage = await preparePage(secondUrl.toString(), WIDTH);
  return [firstPage, secondPage];
}

/** @deprecated */
// XXX Remove helper eventually!
export async function assertContainText(
  pages: Page[],
  selector: IDSelector,
  value: string
) {
  for (let i = 0; i < pages.length; i++) {
    await expect(pages[i].locator(selector)).toContainText(value);
  }
}

export async function expectJson(
  oneOrMorePages: Page | Page[],
  selector: IDSelector,
  expectedValue: Json
) {
  const pages = Array.isArray(oneOrMorePages)
    ? oneOrMorePages
    : [oneOrMorePages];
  for (const page of pages) {
    await expect(getJson(page, selector)).resolves.toEqual(expectedValue);
  }
}

export async function getJson(page: Page, selector: IDSelector): Promise<Json> {
  const text = await page.locator(selector).innerText();
  if (!text) {
    throw new Error(`Could not find HTML element #${selector}`);
  }
  return JSON.parse(text);
}

export async function assertJsonContentAreEquals(
  pages: Page[],
  selector: IDSelector
) {
  const firstPageContent = await getJson(pages[0], selector);

  for (const page of pages.slice(1)) {
    const otherPageContent = await getJson(page, selector);
    expect(firstPageContent).toEqual(otherPageContent);
  }

  pages.forEach(async (page) => {
    expect(firstPageContent).toEqual(await getJson(page, selector));
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TimeoutOptions = {
  timeout?: number;
  step?: number;
};

const DEFAULT_TIMEOUT = 1500;
const DEFAULT_STEP = 60;

export async function waitForTextContent(
  page: Page,
  selector: IDSelector,
  expectedText: string,
  options?: TimeoutOptions
) {
  const start = Date.now();
  const timeoutAt = start + (options?.timeout ?? DEFAULT_TIMEOUT);
  const attempts = [];

  do {
    const foundText = await page.locator(selector).innerText();
    const ms = Date.now() - start;
    if (!foundText) {
      attempts.push(
        `(after ${ms}ms) Element with id ${selector} not found yet`
      );
    } else if (foundText !== expectedText) {
      attempts.push(
        `(after ${ms}ms) Element did not contain expected text yet: ${JSON.stringify(
          foundText
        )}`
      );
    } else {
      // Done!
      return;
    }
    await sleep(options?.step ?? DEFAULT_STEP);
  } while (Date.now() < timeoutAt);

  const ms = Date.now() - start;
  attempts.push(`(after ${ms}ms) Timed out`);
  throw new Error(
    `Expected text content was never found\n\nid: ${selector}\nI tried looking for: ${JSON.stringify(
      expectedText
    )}\n\nHere were my attempts:\n${attempts.join("\n")}`
  );
}

export async function waitForContentToBeEquals(
  pages: Page[],
  selector: IDSelector
) {
  for (let i = 0; i < 20; i++) {
    const firstPageContent = await getJson(pages[0], selector);

    let allEquals = true;

    for (let pI = 1; pI < pages.length; pI++) {
      const otherPageContent = await getJson(pages[pI], selector);

      if (!_.isEqual(firstPageContent, otherPageContent)) {
        allEquals = false;
      }
    }

    if (allEquals) {
      return;
    }

    await sleep(100);
  }

  await assertJsonContentAreEquals(pages, selector);
}

export function pickRandomItem<T>(array: T[]) {
  return array[randomNumber(array.length)];
}

export function pickNumberOfUnderRedo() {
  const undoRedoProb = randomNumber(100);

  if (undoRedoProb > 75) {
    return randomNumber(5);
  }

  return 0;
}
