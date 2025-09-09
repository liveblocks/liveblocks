import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  nanoSleep,
  pickFrom,
  pickNumberOfUndoRedo,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
} from "../utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/storage/list";

test.describe("Storage - LiveList", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("list push basic", async () => {
    const [page1] = pages;

    await test.step("Clear initial list", async () => {
      await page1.click("#clear");
      await waitForJson(pages, "#numItems", 0);
    });

    await test.step("Push item to list", async () => {
      await page1.click("#push");
      await waitForJson(pages, "#numItems", 1);
    });

    await test.step("Verify synchronization across pages", async () => {
      await waitUntilEqualOnAllPages(pages, "#items");
    });

    await page1.click("#push");
    await waitForJson(pages, "#numItems", 2);
    await waitUntilEqualOnAllPages(pages, "#items");

    await page1.click("#push");
    await waitForJson(pages, "#numItems", 3);
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  test("list move", async () => {
    const [page1, _page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    for (let i = 0; i < 5; i++) {
      await page1.click("#push");
    }

    await expectJson(page1, "#numItems", 5);
    await waitUntilEqualOnAllPages(pages, "#items");

    for (let i = 0; i < 10; i++) {
      await page1.click("#move");
    }

    await expectJson(page1, "#numItems", 5);
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  test("push conflicts", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);

    for (let i = 0; i < 10; i++) {
      await page1.click("#push");
      await page2.click("#push");
    }

    // await expectJson(pages, "#numItems", n => n >= 10 && n <= 20);
    await waitForJson(pages, "#numItems", 20);
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  test("set conflicts", async () => {
    const [page1, page2] = pages;
    await page1.click("#clear");
    await page1.click("#push");
    await waitForJson(pages, "#numItems", 1);
    await waitUntilEqualOnAllPages(pages, "#items");

    for (let i = 0; i < 30; i++) {
      await page1.click("#set");
      await page2.click("#set");
    }

    await waitForJson(pages, "#syncStatus", "synchronized");
    await expectJson(page1, "#numItems", 1);
    await expectJson(page2, "#numItems", 1);
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  // TODO Look into why this test is flaky
  test.skip("fuzzy with undo/redo push delete and move", async () => {
    const [page1] = pages;
    await page1.click("#clear");
    await waitForJson(pages, "#numItems", 0);
    await waitUntilEqualOnAllPages(pages, "#items");

    const numberOfItemsAtStart = 5;
    for (let i = 0; i < numberOfItemsAtStart; i++) {
      await page1.click("#push");
    }

    await expectJson(page1, "#numItems", numberOfItemsAtStart);

    await waitUntilEqualOnAllPages(pages, "#items");

    const actions = ["#push", "#delete", "#move", "#set"];
    for (let i = 0; i < 50; i++) {
      for (const page of pages) {
        const nbofUndoRedo = pickNumberOfUndoRedo();
        if (nbofUndoRedo > 0) {
          for (let y = 0; y < nbofUndoRedo; y++) {
            await page.click("#undo", { force: true });
          }
          for (let y = 0; y < nbofUndoRedo; y++) {
            await page.click("#redo", { force: true });
          }
        } else {
          await page.click(pickFrom(actions), { force: true });
        }
      }
      await nanoSleep();
    }

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitUntilEqualOnAllPages(pages, "#items");
  });

  test("move/insert/undo should result in consistent state across clients", async () => {
    // This test replicates the exact scenario from the LiveList consistency bug:
    // 1. Both clients start with [e1, e2, e3, e4]
    // 2. Client A: move(2, 0) -> [e3, e1, e2, e4]
    // 3. Sync: Both clients see [e3, e1, e2, e4]
    // 4. Client B: insert(3, e5) -> [e3, e1, e2, e5, e4]
    // 5. Sync: Both clients see [e3, e1, e2, e5, e4]
    // 6. Client A: undo the move
    // 7. Expected: both clients should converge to the same final state
    const [page1, page2] = pages;

    await test.step("Setup initial state with [e1, e2, e3, e4]", async () => {
      // Clear the list first
      await page1.click("#clear");
      await waitForJson(pages, "#numItems", 0);

      // Add 4 elements to match the original test setup
      // The original test starts with: { list: new LiveList(["e1", "e2", "e3", "e4"]) }
      for (let i = 0; i < 4; i++) {
        await page1.click("#push");
      }
      await waitForJson(pages, "#numItems", 4);
      await waitUntilEqualOnAllPages(pages, "#items");

      const initialState = await page1.$eval("#items", (el) => el.textContent);
    });

    await test.step("Client A moves item from index 2 to index 0", async () => {
      // Client A (page1) moves item at index 2 to index 0
      // This should move the 3rd item to the front
      // Before: [e1, e2, e3, e4] -> After: [e3, e1, e2, e4]

      const initialItems = await page1.$eval("#items", (el) => el.textContent);

      // Use the deterministic move button
      await page1.click("#move-2-to-0");

      // Wait for synchronization
      await waitForJson(pages, "#syncStatus", "synchronized");
      await waitUntilEqualOnAllPages(pages, "#items");

      const afterMove = await page1.$eval("#items", (el) => el.textContent);
    });

    await test.step("Client B inserts an item at index 3", async () => {
      // Client B (page2) inserts an item at index 3
      // This matches the original test: insert("e5", 3)

      await page2.click("#insert-at-3");

      // Wait for synchronization
      await waitForJson(pages, "#syncStatus", "synchronized");
      await waitUntilEqualOnAllPages(pages, "#items");

      const afterInsert = await page1.$eval("#items", (el) => el.textContent);
    });

    await test.step("Client A undoes the move", async () => {
      // Client A undoes the move operation
      await page1.click("#undo");

      // Wait for synchronization
      await waitForJson(pages, "#syncStatus", "synchronized");
      await waitUntilEqualOnAllPages(pages, "#items");

      const finalState = await page1.$eval("#items", (el) => el.textContent);
    });

    await test.step("Verify both clients have consistent state", async () => {
      // Both clients should have the same final state
      await waitUntilEqualOnAllPages(pages, "#items");

      const client1State = await page1.$eval("#items", (el) => el.textContent);
      const client2State = await page2.$eval("#items", (el) => el.textContent);


      // The test passes if waitUntilEqualOnAllPages doesn't throw
      // This ensures both clients converged to the same state
    });
  });
});
