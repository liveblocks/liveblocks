import type { Json } from "@liveblocks/client";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { chromium, expect } from "@playwright/test";
import _ from "lodash";

import { randomInt } from "../utils";
import { DEFAULT_THROTTLE } from "../utils/createClient";

export type IDSelector = `#${string}`;

const WIDTH = 640;
const HEIGHT = 800;
const DEFAULT_ROOM_ID_MAX_LENGTH = 100;
const ABSOLUTE_ROOM_ID_MAX_LENGTH = 128;

function getTestFilename(fullPath: string): string {
  const parts = fullPath.split("/");
  const index = parts.findIndex((part) => part === "test");
  if (index < 0) {
    throw new Error("Cannot find the test file name reliably");
  }
  return parts.splice(index + 1).join("/");
}

/**
 * Generates a unique room ID for this specific test, based on the test's
 * filename and the full test name. Additionally, will prepend the Git SHA if
 * available (e.g. when running in CI).
 */
export function genRoomId(testInfo: TestInfo, suffix = "") {
  const prefix = process.env.NEXT_PUBLIC_GITHUB_SHA
    ? process.env.NEXT_PUBLIC_GITHUB_SHA.slice(0, 2)
    : null;
  const title = [prefix, getTestFilename(testInfo.file), testInfo.title]
    .filter(Boolean)
    .join(":")
    .toLowerCase()
    .replace(/[^/:.\w\d]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  let roomId = `e2e:${title}`;
  const maxLength =
    suffix.length === 0
      ? DEFAULT_ROOM_ID_MAX_LENGTH
      : ABSOLUTE_ROOM_ID_MAX_LENGTH;
  const maxBaseLength = maxLength - suffix.length;
  if (maxBaseLength < 8) {
    throw new Error(`Room ID suffix is too long: ${suffix.length}`);
  }

  if (roomId.length > maxBaseLength) {
    // Room IDs cannot be longer than 128 chars. If this happens, take a short
    // hash from the full room ID, then cut it off and attach the hash. This
    // way, test names can still be arbitrarily long, human-readable (at least
    // the first part of it), and yet still stable for reuse, so we don't have
    // an ever-growing set of rooms when running against DEV or PROD.
    const hash = hash7(roomId);
    roomId = roomId.slice(0, maxBaseLength - hash.length) + hash;
  }
  return `${roomId}${suffix}`;
}

/**
 * Super lightweight, simple, synchronous, hash function, using the DJB2
 * algorithm.
 */
function hash7(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(7, "0").slice(0, 7); // Ensure the hash is treated as an unsigned 32-bit integer
}

type WindowOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export async function preparePage(url: string, options?: WindowOptions) {
  const width = options?.width ?? WIDTH;
  const height = options?.height ?? HEIGHT;
  const browser = await chromium.launch({
    args: [
      `--window-size=${width},${height}`,
      `--window-position=${options?.x ?? 0},${options?.y ?? 0}`,
    ],
  });
  const context = await browser.newContext({
    viewport: { width, height },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  return page;
}

const BG_COLORS = [
  "#cafbca",
  "#e9ddf9",

  "#e6f5ff",
  "#fff3e6",
  "#f2f2f2",
  "#fedddd",
  "#ffffcc",
  "#e8f8f5",
  "#f3e5f5",
  "#fff0d6",
  "#f0f9ff",
  "#fcf1de",
  "#e6ffd9",
  "#ffeee6",
  "#f8f8f8",
  "#fff5f5",
  "#e9e9e9",
  "#f7e9ff",
  "#f4fff0",
  "#fff1f1",
  "#fdf5e6",
  "#f1f9ff",

  "#fffaed",
  "#e0f9ff",
  "#fff9e6",
  "#f2fff9",
  "#faf9ff",
];

type PreparePagesOptions = WindowOptions & {
  /** How many windows to open */
  n?: number;
};

export async function preparePages(url: string): Promise<[Page, Page]>;
export async function preparePages(
  url: string,
  options?: PreparePagesOptions
): Promise<Page[]>;
export async function preparePages(
  url: string,
  options?: PreparePagesOptions
): Promise<Page[]> {
  const n = options?.n ?? 2;
  return Promise.all(
    Array.from({ length: n }).map((_, index) => {
      const pageUrl = new URL(url);
      pageUrl.searchParams.set("bg", BG_COLORS[index % BG_COLORS.length]);

      // If n=2, open the windows side-by-side, otherwise open them as a fan
      const xPos = n <= 2 && index === 1 ? WIDTH : index * 50;
      return preparePage(pageUrl.toString(), {
        ...options,
        x: options?.x ?? xPos,
      });
    })
  );
}

export async function waitForJson(
  oneOrMorePages: Page | Page[],
  selector: IDSelector,
  expectedValue: Json | undefined,
  options?: { timeout?: number }
) {
  const pages = Array.isArray(oneOrMorePages)
    ? oneOrMorePages
    : [oneOrMorePages];

  const expectedText =
    expectedValue === undefined
      ? "undefined"
      : JSON.stringify(expectedValue, null, 2);
  return Promise.all(
    pages.map((page) =>
      expect(page.locator(selector)).toHaveText(expectedText, {
        timeout: options?.timeout ?? 5000,
      })
    )
  );
}

export async function waitForTextContains(
  oneOrMorePages: Page | Page[],
  selector: IDSelector,
  expectedValue: string,
  options?: { timeout?: number }
) {
  const pages = Array.isArray(oneOrMorePages)
    ? oneOrMorePages
    : [oneOrMorePages];

  return Promise.all(
    pages.map((page) =>
      expect(page.locator(selector)).toContainText(expectedValue, {
        timeout: options?.timeout ?? 5000,
      })
    )
  );
}

export async function waitUntilFlushed() {
  // This isn't a fancy implementation. It just waits for <default throttle>
  // millis, so by the time the test continues, the messages have been sent to
  // the server ¯\_(ツ)_/¯
  await sleep(DEFAULT_THROTTLE);
}

export async function expectJson(
  page: Page,
  selector: IDSelector,
  expectedValue: Json | undefined
) {
  if (expectedValue !== undefined) {
    await expect(getJson(page, selector)).resolves.toEqual(expectedValue);
  } else {
    const text = await page.locator(selector).innerText();
    expect(text).toEqual("undefined");
  }
}

export async function getJson(
  page: Page,
  selector: IDSelector
): Promise<Json | undefined> {
  const text = await page.locator(selector).innerText();
  if (!text) {
    throw new Error(`Could not find HTML element #${selector}`);
  }
  return text === "undefined" ? undefined : (JSON.parse(text) as Json);
}

async function getBoth(pages: [Page, Page], selector: IDSelector) {
  const [page1, page2] = pages;
  const value1 = await getJson(page1, selector);
  const value2 = await getJson(page2, selector);
  return [value1, value2];
}

type TraceEntry = { t: number; dir: string; raw: string };

/**
 * Reads the recorded WebSocket trace (see utils/recordingWebSocket.ts) from
 * each page and prints it. Called when pages disagree, so a (usually flaky,
 * timing-related) CI failure leaves the exact client/server protocol exchange
 * in the logs instead of just "expected X to be Y".
 */
async function dumpDivergence(
  pages: [Page, Page],
  selector: IDSelector,
  values: [Json | undefined, Json | undefined]
) {
  /* eslint-disable no-console */
  console.error(`\n========== DIVERGENCE on #${selector} ==========`);
  console.error(`  page1: ${JSON.stringify(values[0])}`);
  console.error(`  page2: ${JSON.stringify(values[1])}`);

  for (let i = 0; i < pages.length; i++) {
    // Full storage pool of this page's client (every node, its parent, its
    // position key, and its value). `_dump` is @internal, present at runtime.
    let pool: string | null = null;
    try {
      pool = await pages[i].evaluate(
        () =>
          // @ts-expect-error -- _dump is @internal and not typed, but it exists at runtime
          globalThis.__lbClient?._dump?.() ?? null
      );
    } catch {
      // Client absent or page closed; skip.
    }
    if (pool) {
      console.error(`\n--- page${i + 1}: storage pool ---\n${pool}`);
    }

    let trace: TraceEntry[] = [];
    try {
      trace = await pages[i].evaluate(
        () => (globalThis as { __lbTrace?: TraceEntry[] }).__lbTrace ?? []
      );
    } catch {
      // Page may be closed/navigated; skip.
    }
    console.error(`\n--- page${i + 1}: ${trace.length} WebSocket frames ---`);
    for (const e of trace) {
      console.error(
        `  [${String(e.t).padStart(7)}ms ${e.dir.toUpperCase().padEnd(5)}] ${e.raw}`
      );
    }
  }
  console.error(`================================================\n`);
  /* eslint-enable no-console */
}

export async function expectJsonEqualOnAllPages(
  pages: [Page, Page],
  selector: IDSelector
) {
  const [value1, value2] = await getBoth(pages, selector);
  if (!_.isEqual(value1, value2)) {
    await dumpDivergence(pages, selector, [value1, value2]);
  }
  expect(value1).toEqual(value2);
}

export async function waitUntilEqualOnAllPages(
  pages: [Page, Page],
  selector: IDSelector,
  options?: {
    maxTries?: number;
    interval?: number;
  }
) {
  const maxTries = options?.maxTries ?? 20;
  const interval = options?.interval ?? 100;

  for (let i = 0; i < maxTries; i++) {
    const [value1, value2] = await getBoth(pages, selector);
    if (_.isEqual(value1, value2)) {
      return; // Great, we're done!
    } else {
      await sleep(interval);
    }
  }

  // We didn't find the values in sync, so call expectJsonEqualOnAllPages() so
  // it will fail the wait
  await expectJsonEqualOnAllPages(pages, selector);
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

// Source: https://github.com/microsoft/playwright/issues/22873
export async function selectText(
  locator: Locator,
  pattern: string | RegExp,
  flags?: string
): Promise<void> {
  await locator.evaluate(
    (element, { pattern, flags }) => {
      const textNode = element.childNodes[0];
      const match = textNode.textContent?.match(new RegExp(pattern, flags));
      if (match) {
        const range = document.createRange();

        range.setStart(textNode, match.index!);
        range.setEnd(textNode, match.index! + match[0].length);
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    },
    { pattern, flags }
  );
}
