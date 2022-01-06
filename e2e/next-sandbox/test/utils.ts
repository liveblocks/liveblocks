import { Page } from "puppeteer";
import randomNumber from "../utils/randomNumber";

export async function getElementById(page: Page, id: string) {
  const element = await page.$(`#${id}`);
  if (element == null) {
    throw new Error(`Element with id "${id}" is missing`);
  }
  return element;
}

export async function getTextContent(page: Page, id: string) {
  const element = await getElementById(page, id);
  const textContentHandle = await element.getProperty("textContent");
  return await textContentHandle!.jsonValue<string>();
}

export async function getJsonContent(page: Page, id: string) {
  return JSON.parse(await getTextContent(page, id));
}

export const CONNECT_DELAY = 2000;

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
