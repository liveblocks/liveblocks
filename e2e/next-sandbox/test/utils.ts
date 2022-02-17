import { Page } from "puppeteer";
import randomNumber from "../utils/randomNumber";

async function getElementById(page: Page, id: string) {
  return await page.$(`#${id}`);
}

export async function getTextContent(page: Page, id: string) {
  const element = await getElementById(page, id);
  if (!element) {
    return null;
  }
  const textContentHandle = await element.getProperty("textContent");
  return await textContentHandle!.jsonValue<string>();
}

export async function getJsonContent(page: Page, id: string) {
  const content = await getTextContent(page, id);
  if (!content) {
    return null;
  }
  return JSON.parse(content);
}

export const CONNECT_DELAY = 2000;

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForContentToBeEquals(
  firstPage: Page,
  secondPage: Page,
  id: string = "items"
) {
  for (let i = 0; i < 20; i++) {
    const firstPageContent = await getTextContent(firstPage, id);
    const secondPageContent = await getTextContent(secondPage, id);

    if (firstPageContent === secondPageContent) {
      return;
    }

    await delay(100);
  }

  expect(await getJsonContent(firstPage, id)).toEqual(
    await getJsonContent(secondPage, id)
  );
}

export async function assertJsonContentAreEquals(
  firstPage: Page,
  secondPage: Page,
  id: string = "items"
) {
  expect(await getJsonContent(firstPage, id)).toEqual(
    await getJsonContent(secondPage, id)
  );
}

export async function assertItems(
  pages: Page[],
  json: any,
  id: string = "items"
) {
  for (const page of pages) {
    expect(await getJsonContent(page, id)).toEqual(json);
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

export async function waitForNElements(
  pages: Page[],
  length: number,
  id: string = "itemsCount"
) {
  const promises = pages.map(async (page) => {
    const dd = await getTextContent(page, id);
    console.log("dddd", dd);
    return page.waitForFunction(
      `document.getElementById("${id}").innerHTML == ${length}`,
      { timeout: 5000 }
    );
  });
  await Promise.all(promises);
}
