import { chromium, expect, Page } from "@playwright/test";
import _ from "lodash";
import randomNumber from "../utils/randomNumber";
import type { Json } from "@liveblocks/client";

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
  const firstPage = await preparePage(url, 0);
  const secondPage = await preparePage(url, WIDTH);

  return [firstPage, secondPage];
}

export async function assertContainText(
  pages: Page[],
  value: string,
  id: string = "itemsCount"
) {
  for (let i = 0; i < pages.length; i++) {
    await expect(pages[i].locator(`#${id}`)).toContainText(value);
  }
}

export async function getTextContentOrEmpty(
  page: Page,
  id: string
): Promise<string> {
  const selector = id.startsWith(".") || id.startsWith("#") ? id : `#${id}`;
  return page.locator(selector).innerText();
}

export async function getTextContent(page: Page, id: string): Promise<string> {
  const text = await getTextContentOrEmpty(page, id);
  if (!text) {
    throw new Error(`Could not find HTML element #${id}`);
  }
  return text;
}

export async function getJsonContent(page: Page, id: string): Promise<Json> {
  const text = await getTextContent(page, id);
  return JSON.parse(text);
}

export async function assertJsonContentAreEquals(
  pages: Page[],
  id: string = "items"
) {
  const firstPageContent = await getJsonContent(pages[0], id);

  for (const page of pages.slice(1)) {
    const otherPageContent = await getJsonContent(page, id);
    expect(firstPageContent).toEqual(otherPageContent);
  }

  pages.forEach(async (page) => {
    expect(firstPageContent).toEqual(await getJsonContent(page, id));
  });
}

export function delay(ms: number) {
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
  id: string,
  expectedText: string,
  options?: TimeoutOptions
) {
  const start = Date.now();
  const timeoutAt = start + (options?.timeout ?? DEFAULT_TIMEOUT);
  const attempts = [];

  do {
    const foundText = await getTextContentOrEmpty(page, id);
    const ms = Date.now() - start;
    if (!foundText) {
      attempts.push(`(after ${ms}ms) Element with id ${id} not found yet`);
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
    await delay(options?.step ?? DEFAULT_STEP);
  } while (Date.now() < timeoutAt);

  const ms = Date.now() - start;
  attempts.push(`(after ${ms}ms) Timed out`);
  throw new Error(
    `Expected text content was never found\n\nid: ${id}\nI tried looking for: ${JSON.stringify(
      expectedText
    )}\n\nHere were my attempts:\n${attempts.join("\n")}`
  );
}

export async function waitForContentToBeEquals(
  pages: Page[],
  id: string = "items"
) {
  for (let i = 0; i < 20; i++) {
    const firstPageContent = await getJsonContent(pages[0], id);

    let allEquals = true;

    for (let pI = 1; pI < pages.length; pI++) {
      const otherPageContent = await getJsonContent(pages[pI], id);

      if (!_.isEqual(firstPageContent, otherPageContent)) {
        allEquals = false;
      }
    }

    if (allEquals) {
      return;
    }

    await delay(100);
  }

  await assertJsonContentAreEquals(pages, id);
}

export async function assertItems(
  pages: Page[],
  json: any,
  id: string = "items"
) {
  for (const page of pages) {
    await expect(getJsonContent(page, id)).toEqual(json);
  }
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
