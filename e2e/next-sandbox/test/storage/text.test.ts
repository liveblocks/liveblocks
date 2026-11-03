import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { ClientMsgCode, OpCode, ServerMsgCode } from "@liveblocks/core";

import {
  genRoomId,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/storage/text";

function wireMessages(frame: string | Buffer): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(
    typeof frame === "string" ? frame : frame.toString()
  );
  const messages = Array.isArray(parsed) ? parsed : [parsed];
  return messages.filter(
    (message): message is Record<string, unknown> =>
      typeof message === "object" && message !== null
  );
}

function textAck(frame: string | Buffer): Record<string, unknown> | undefined {
  for (const message of wireMessages(frame)) {
    if (
      message.type !== ServerMsgCode.UPDATE_STORAGE ||
      !Array.isArray(message.ops)
    ) {
      continue;
    }
    for (const op of message.ops) {
      if (
        typeof op === "object" &&
        op !== null &&
        op.type === OpCode.UPDATE_TEXT &&
        typeof op.opId === "string"
      ) {
        return op;
      }
    }
  }
  return undefined;
}

test.describe("Storage - LiveText", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
    await pages[0].click("#reset");
    await waitForJson(pages, "#plainText", "Hello");
    await waitForJson(pages, "#syncStatus", "synchronized");
  });

  test.afterEach(() => Promise.all(pages.map((page) => page.close())));

  test("syncs text and range attributes", async () => {
    const [page1, page2] = pages;

    await waitForJson(pages, "#plainText", "Hello");
    await waitForJson(pages, "#text", [["Hello"]]);

    await page1.click("#insert");
    await waitForJson(pages, "#plainText", "Hello world");
    await waitUntilEqualOnAllPages(pages, "#text");

    await page2.click("#format");
    await waitForJson(pages, "#text", [["Hello", { bold: true }], [" world"]]);

    await page1.click("#unformat");
    await waitForJson(pages, "#text", [["Hello world"]]);

    await page2.click("#delete");
    await waitForJson(pages, "#plainText", "ello world");
    await waitForJson(pages, "#text", [["ello world"]]);
  });

  test("reconciles an ack from the current connection after a reconnect snapshot", async () => {
    const [page1, page2] = pages;
    const pageErrors: string[] = [];
    page1.on("pageerror", (error) => pageErrors.push(error.message));

    let heldFetch: string | Buffer | undefined;
    let releaseFirstAck: (() => void) | undefined;
    let releaseReplay: (() => void) | undefined;
    let fetchCount = 0;
    let firstUpdateSent = false;
    let snapshotLoaded = false;
    let sawHistorylessAck = false;
    let sawHistoryAck = false;
    const routedPaths: string[] = [];
    let intercept = false;

    // Proxy the real dev connection. The snapshot precedes the first edit's
    // ack, while the replay response waits until that historyless ack arrives.
    await page1.routeWebSocket("**", (ws) => {
      const path = new URL(ws.url()).pathname;
      routedPaths.push(path);
      if (path !== "/v8" && path !== "/v8/") {
        ws.connectToServer();
        return;
      }
      const server = ws.connectToServer();
      ws.onMessage((frame) => {
        if (!intercept) {
          server.send(frame);
          return;
        }
        const messages = wireMessages(frame);
        if (
          messages.some(
            (message) => message.type === ClientMsgCode.FETCH_STORAGE
          )
        ) {
          fetchCount++;
          if (fetchCount === 1) {
            heldFetch = frame;
            return;
          }
        }
        if (
          messages.some(
            (message) =>
              message.type === ClientMsgCode.UPDATE_STORAGE &&
              message.includeTextHistory === true
          )
        ) {
          releaseReplay = () => server.send(frame);
          return;
        }
        if (
          heldFetch !== undefined &&
          messages.some(
            (message) => message.type === ClientMsgCode.UPDATE_STORAGE
          )
        ) {
          firstUpdateSent = true;
          server.send(heldFetch);
          heldFetch = undefined;
        }
        server.send(frame);
      });
      server.onMessage((frame) => {
        if (!intercept) {
          ws.send(frame);
          return;
        }
        const ack = textAck(frame);
        if (ack !== undefined) {
          if (Array.isArray(ack.history)) {
            sawHistoryAck = true;
          } else if (!sawHistorylessAck) {
            sawHistorylessAck = true;
            releaseFirstAck = () => ws.send(frame);
            return;
          }
        }
        ws.send(frame);
        if (
          wireMessages(frame).some(
            (message) => message.type === ServerMsgCode.STORAGE_STREAM_END
          )
        ) {
          snapshotLoaded = true;
        }
      });
    });

    await page1.reload({ waitUntil: "networkidle" });
    await expect.poll(() => routedPaths.includes("/v8")).toBe(true);
    await waitForJson(pages, "#plainText", "Hello");
    await page1.click("#disconnect");
    await waitForJson(page1, "#status", "initial");
    await page2.click("#insert");
    await waitForJson(page2, "#syncStatus", "synchronized");

    intercept = true;
    await page1.click("#reconnect");
    await waitForJson(page1, "#status", "connected");
    await expect
      .poll(() => heldFetch !== undefined, {
        message: `Storage fetch was not intercepted; routed paths: ${routedPaths.join(", ")}`,
      })
      .toBe(true);

    await page1.click("#insert");
    await expect.poll(() => firstUpdateSent).toBe(true);
    await page1.click("#insert");
    await expect
      .poll(
        () =>
          snapshotLoaded &&
          sawHistorylessAck &&
          releaseFirstAck !== undefined &&
          releaseReplay !== undefined
      )
      .toBe(true);
    expect(fetchCount).toBe(1);
    expect(releaseFirstAck).toBeDefined();
    expect(releaseReplay).toBeDefined();
    releaseFirstAck?.();
    releaseReplay?.();

    await expect.poll(() => sawHistoryAck).toBe(true);
    await waitForJson(pages, "#plainText", "Hello world world world", {
      timeout: 20_000,
    });
    await waitForJson(pages, "#syncStatus", "synchronized", {
      timeout: 20_000,
    });
    expect(pageErrors).toEqual([]);
  });
});
