import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  genRoomId,
  nanoSleep,
  preparePage,
  preparePages,
  waitForJson,
  waitUntilEqualOnAllPages,
  waitUntilFlushed,
} from "./utils";

test.describe.configure({ mode: "parallel" });

const TEST_URL = "http://localhost:3007/zustand-kanban";

test.describe("Zustand Kanban", () => {
  let pages: [Page, Page];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(`${TEST_URL}?room=${encodeURIComponent(room)}`);
  });

  test.afterEach(() => Promise.all(pages.map((page) => page.close())));

  test("populate syncs across clients", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#populate");
    await waitUntilFlushed();
    await waitForJson(pages, "#numCards", 7);
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("add card from both clients", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitForJson(pages, "#numCards", 1);
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page2.getByTestId("add-card-in-progress").click();
    await waitUntilFlushed();
    await waitForJson(pages, "#numCards", 2);
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Verify cards are in the right columns
    await expect(
      page1.getByTestId("column-todo").locator("[data-card-id]")
    ).toHaveCount(1);
    await expect(
      page1.getByTestId("column-in-progress").locator("[data-card-id]")
    ).toHaveCount(1);

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("delete card syncs across clients", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#populate");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Delete a card from page2
    const card = page2
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .first();
    const cardId = await card.getAttribute("data-card-id");
    await page2.getByTestId(`delete-card-${cardId}`).click();

    await waitUntilFlushed();
    await waitForJson(pages, "#numCards", 6);
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("update card title syncs across clients", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Get the card id from page1
    const card = page1
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .first();
    const cardId = await card.getAttribute("data-card-id");

    // Update the title on page1
    await page1.getByTestId(`card-title-${cardId}`).fill("Hello from page1");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Update the title on page2
    await page2.getByTestId(`card-title-${cardId}`).fill("Hello from page2");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("move card between columns via select syncs", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    const card = page1
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .first();
    const cardId = await card.getAttribute("data-card-id");

    // Move to "in-progress" from page1
    await page1.getByTestId(`card-status-${cardId}`).selectOption("in-progress");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Verify on both pages
    for (const page of pages) {
      await expect(
        page.getByTestId("column-todo").locator("[data-card-id]")
      ).toHaveCount(0);
      await expect(
        page.getByTestId("column-in-progress").locator("[data-card-id]")
      ).toHaveCount(1);
    }

    // Now page2 moves it to "done"
    await page2.getByTestId(`card-status-${cardId}`).selectOption("done");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    for (const page of pages) {
      await expect(
        page.getByTestId("column-in-progress").locator("[data-card-id]")
      ).toHaveCount(0);
      await expect(
        page.getByTestId("column-done").locator("[data-card-id]")
      ).toHaveCount(1);
    }

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("undo and redo sync across clients", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitForJson(pages, "#numCards", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitForJson(pages, "#numCards", 2);
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Undo on page1
    await page1.click("#undo");
    await waitUntilFlushed();
    await waitForJson(pages, "#numCards", 1);
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Redo on page1
    await page1.click("#redo");
    await waitUntilFlushed();
    await waitForJson(pages, "#numCards", 2);
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("presence: selected card visible to other", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    const card = page1
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .first();
    const cardId = await card.getAttribute("data-card-id");

    // Focus on page1 — page2 sees it in presence
    await page1.getByTestId(`card-title-${cardId}`).focus();
    await waitForJson(page2, "#theirPresence", {
      selectedCardId: cardId,
      draggedCardId: null,
    });

    // Blur on page1 — page2 sees null
    await page1.getByTestId(`card-title-${cardId}`).blur();
    await waitForJson(page2, "#theirPresence", {
      selectedCardId: null,
      draggedCardId: null,
    });

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("concurrent adds from both clients", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    // Both clients add cards rapidly
    for (let i = 0; i < 5; i++) {
      await page1.getByTestId("add-card-todo").click();
      await page2.getByTestId("add-card-done").click();
      await nanoSleep();
    }

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitForJson(pages, "#numCards", 10);
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("concurrent edits: add and delete from different clients", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#populate");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    // page1 adds cards, page2 deletes cards concurrently
    for (let i = 0; i < 3; i++) {
      await page1.getByTestId("add-card-todo").click();

      const cards = page2
        .getByTestId("column-done")
        .locator("[data-card-id]");
      const count = await cards.count();
      if (count > 0) {
        const cardId = await cards.first().getAttribute("data-card-id");
        await page2.getByTestId(`delete-card-${cardId}`).click();
      }
      await nanoSleep();
    }

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("conflict: both clients move same card to different columns", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    const card = page1
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .first();
    const cardId = await card.getAttribute("data-card-id");

    // Both clients move the same card to different columns simultaneously
    await page1.getByTestId(`card-status-${cardId}`).selectOption("in-progress");
    await page2.getByTestId(`card-status-${cardId}`).selectOption("done");

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitForJson(pages, "#numCards", 1);
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("conflict: both clients edit same card title", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    const card = page1
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .first();
    const cardId = await card.getAttribute("data-card-id");

    // Both clients type into the same card title at the same time
    await page1.getByTestId(`card-title-${cardId}`).fill("AAA");
    await page2.getByTestId(`card-title-${cardId}`).fill("BBB");

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("conflict: one client deletes card while other edits it", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    const card = page1
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .first();
    const cardId = await card.getAttribute("data-card-id");

    // page1 edits title, page2 deletes the card
    await page1.getByTestId(`card-title-${cardId}`).fill("Editing...");
    await page2.getByTestId(`delete-card-${cardId}`).click();

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("conflict: rapid inserts while other client edits existing card", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    // Start with 3 cards in todo
    for (let i = 0; i < 3; i++) {
      await page1.getByTestId("add-card-todo").click();
    }
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Get the last card (bottom of column, since adds go to the top)
    const existingCard = page2
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .last();
    const cardId = await existingCard.getAttribute("data-card-id");

    // page2 edits the existing card's title while page1 rapidly inserts
    // new cards at the top of the same column
    const titleInput = page2.getByTestId(`card-title-${cardId}`);
    await titleInput.click();
    await titleInput.fill("");

    for (let i = 0; i < 10; i++) {
      await page1.getByTestId("add-card-todo").click();
      // page2 types a character
      await titleInput.pressSequentially("x", { delay: 0 });
      await nanoSleep();
    }

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Verify the edited card still exists with its title intact on both pages
    await waitForJson(pages, "#numCards", 13);

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("conflict: inserts + title edit, then undo/redo across clients", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    // Start with 1 card
    await page1.getByTestId("add-card-todo").click();
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    const cardId = await page2
      .getByTestId("column-todo")
      .locator("[data-card-id]")
      .first()
      .getAttribute("data-card-id");
    const titleInput = page2.getByTestId(`card-title-${cardId}`);

    // Client B (page1) adds 3 cards, client A (page2) edits the title
    await titleInput.click();
    await titleInput.fill("edited");
    for (let i = 0; i < 3; i++) {
      await page1.getByTestId("add-card-todo").click();
      await nanoSleep();
    }
    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitForJson(pages, "#numCards", 4);
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Client B undoes all 3 adds — only the edited card remains
    await page1.click("#undo");
    await page1.click("#undo");
    await page1.click("#undo");
    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitForJson(pages, "#numCards", 1);
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Client B redoes all 3 — cards come back
    await page1.click("#redo");
    await page1.click("#redo");
    await page1.click("#redo");
    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitForJson(pages, "#numCards", 4);
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Client A undoes its title edit — original title reappears
    await page2.click("#undo");
    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitForJson(pages, "#numCards", 4);
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("conflict: both clients add and move cards across all columns", async () => {
    const [page1, page2] = pages;

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
    await waitForJson(pages, "#numOthers", 1);

    await page1.click("#populate");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages(pages, "#columns");

    // Both clients perform mixed operations concurrently
    for (let i = 0; i < 5; i++) {
      // page1 adds to random columns
      await page1.getByTestId("add-card-todo").click();

      // page2 moves cards between columns
      const cards = page2
        .getByTestId("column-in-progress")
        .locator("[data-card-id]");
      const count = await cards.count();
      if (count > 0) {
        const cardId = await cards.first().getAttribute("data-card-id");
        await page2.getByTestId(`card-status-${cardId}`).selectOption("done");
      }
      await nanoSleep();
    }

    await waitForJson(pages, "#syncStatus", "synchronized");
    await waitUntilEqualOnAllPages(pages, "#columns");

    await page1.click("#clear");
    await waitForJson(pages, "#numCards", 0);
  });

  test("render counts: editing one card only re-renders that card and its column", async () => {
    // This test opens page2 AFTER page1 populates, so all render counts
    // on page2 start at 1 (initial render only).
    const [page1] = pages;
    const room = new URL(page1.url()).searchParams.get("room")!;

    await page1.click("#clear");
    await waitForJson(page1, "#numCards", 0);

    await page1.click("#populate");
    await waitUntilFlushed();
    await waitForJson(page1, "#numCards", 7);

    // Open page2 after storage is populated
    const page2 = await preparePage(
      `${TEST_URL}?room=${encodeURIComponent(room)}`
    );

    await waitForJson(page2, "#numCards", 7);
    await waitUntilEqualOnAllPages([page1, page2], "#columns");

    // Collect all card IDs and their render counts on page2 — all should be 1
    const allCards = page2.locator("[data-card-id]");
    const cardCount = await allCards.count();
    for (let i = 0; i < cardCount; i++) {
      const cardId = await allCards.nth(i).getAttribute("data-card-id");
      await expect(page2.getByTestId(`card-renders-${cardId}`)).toHaveText("1");
    }
    for (const colId of ["todo", "in-progress", "done"]) {
      await expect(page2.getByTestId(`column-renders-${colId}`)).toHaveText("1");
    }

    // Get the middle card in the "in-progress" column (which has 2 cards)
    const inProgressCards = page2
      .getByTestId("column-in-progress")
      .locator("[data-card-id]");
    const middleCard = inProgressCards.first();
    const editedCardId = await middleCard.getAttribute("data-card-id");

    // Edit that card's title 3 times from page1
    const titleInput = page1.getByTestId(`card-title-${editedCardId}`);
    await titleInput.fill("edit 1");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages([page1, page2], "#columns");

    await titleInput.fill("edit 2");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages([page1, page2], "#columns");

    await titleInput.fill("edit 3");
    await waitUntilFlushed();
    await waitUntilEqualOnAllPages([page1, page2], "#columns");

    // On page2: only the edited card and its column should have render count > 1
    // All other cards and columns should still be at 1
    for (let i = 0; i < cardCount; i++) {
      const cardId = await page2.locator("[data-card-id]").nth(i).getAttribute("data-card-id");
      const renders = await page2.getByTestId(`card-renders-${cardId}`).innerText();
      if (cardId === editedCardId) {
        expect(Number(renders)).toBeGreaterThan(1);
      } else {
        expect(renders).toBe("1");
      }
    }

    // Only the in-progress column should have re-rendered
    for (const colId of ["todo", "in-progress", "done"]) {
      const renders = await page2.getByTestId(`column-renders-${colId}`).innerText();
      if (colId === "in-progress") {
        expect(Number(renders)).toBeGreaterThan(1);
      } else {
        expect(renders).toBe("1");
      }
    }

    await page2.close();
    await page1.click("#clear");
    await waitForJson(page1, "#numCards", 0);
  });
});
