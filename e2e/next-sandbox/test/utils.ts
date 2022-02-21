import { chromium, expect, Page } from "@playwright/test";

import randomNumber from "../utils/randomNumber";

const WIDTH = 640;
const HEIGHT = 800;

export async function preparePages(url: string) {
  let firstPage: Page, secondPage: Page;
  const browser = await chromium.launch({
    args: [
      `--no-sandbox`,
      `--disable-setuid-sandbox`,
      `--window-size=${WIDTH},${HEIGHT}`,
      `--window-position=0,0`,
      "--disable-dev-shm-usage",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 640, height: 800 },
  });
  firstPage = await context.newPage();
  await firstPage.goto(url);

  const browser2 = await chromium.launch({
    args: [
      `--no-sandbox`,
      `--disable-setuid-sandbox`,
      `--window-size=${WIDTH},${HEIGHT}`,
      `--window-position=${WIDTH},0`,
      "--disable-dev-shm-usage",
    ],
  });
  const context2 = await browser2.newContext({
    viewport: { width: 640, height: 800 },
  });
  secondPage = await context2.newPage();
  await secondPage.goto(url);

  return [firstPage, secondPage];
}

export async function assertContainText(pages: Page[], value: string) {
  for (let i = 0; i < pages.length; i++) {
    await expect(pages[i].locator("#itemsCount")).toContainText(value);
  }

  // pages.forEach(async (page, index) => {
  //   await expect(
  //     page.locator("#itemsCount"),
  //     "page" + index + message
  //   ).toContainText(value);
  // });
}

export async function getTextContent(page: Page, id: string) {
  const element = await page.locator(`#${id}`).innerText();
  if (!element) {
    return null;
  }
  return element;
}

export async function getJsonContent(page: Page, id: string) {
  const content = await getTextContent(page, id);
  if (!content) {
    return null;
  }
  return JSON.parse(content);
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
    const firstPageContent = await getTextContent(pages[0], id);

    let allEquals = true;
    for (let pI = 1; i < pages.length; i++) {
      const otherPageContent = await getTextContent(pages[pI], id);
      if (firstPageContent !== otherPageContent) {
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
