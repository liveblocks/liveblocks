import { chromium, expect, Page } from "@playwright/test";
import { Json } from "@liveblocks/client";
import _ from "lodash";
import randomNumber from "../utils/randomNumber";

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

export async function getTextContent(page: Page, id: string): Promise<string> {
  const element = await page.locator(`#${id}`).innerText();
  if (!element) {
    throw new Error(`Could not find HTML element #${id}`);
  }
  return element;
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
  pages.forEach(async (page) => {
    expect(firstPageContent).toEqual(await getJsonContent(page, id));
  });
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
