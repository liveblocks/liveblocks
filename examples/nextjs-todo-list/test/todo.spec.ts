import { test, expect } from "@playwright/test";

// Each test gets a unique room to avoid cross-test interference.
// The room ID is derived from the test title + worker index.
function roomId(testInfo: { workerIndex: number; title: string }) {
  let hash = 0;
  const raw = `pw-${testInfo.workerIndex}-${testInfo.title}`;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `todo-test-${(hash >>> 0).toString(36)}`;
}

test.describe("Todo list", () => {
  test("should load the app and show the input", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    const input = page.getByPlaceholder("What needs to be done?");
    await expect(input).toBeVisible();
  });

  test("should show user count text", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    await expect(page.locator(".who_is_here")).toContainText(
      "other users online"
    );
  });

  test("should add a todo", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    const input = page.getByPlaceholder("What needs to be done?");
    await expect(input).toBeVisible();

    await input.fill("Buy groceries");
    await input.press("Enter");

    const todo = page.locator(".todo_container");
    await expect(todo).toHaveCount(1);
    await expect(todo).toContainText("Buy groceries");
  });

  test("should add multiple todos", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    const input = page.getByPlaceholder("What needs to be done?");
    await expect(input).toBeVisible();

    await input.fill("Buy groceries");
    await input.press("Enter");
    await input.fill("Walk the dog");
    await input.press("Enter");
    await input.fill("Read a book");
    await input.press("Enter");

    const todos = page.locator(".todo_container");
    await expect(todos).toHaveCount(3);
    await expect(todos.nth(0)).toContainText("Buy groceries");
    await expect(todos.nth(1)).toContainText("Walk the dog");
    await expect(todos.nth(2)).toContainText("Read a book");
  });

  test("should clear input after adding a todo", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    const input = page.getByPlaceholder("What needs to be done?");
    await expect(input).toBeVisible();

    await input.fill("Buy groceries");
    await input.press("Enter");

    await expect(input).toHaveValue("");
  });

  test("should not add empty todo on Enter", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    const input = page.getByPlaceholder("What needs to be done?");
    await expect(input).toBeVisible();

    await input.press("Enter");

    await expect(page.locator(".todo_container")).toHaveCount(0);
  });

  test("should toggle a todo checked", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    const input = page.getByPlaceholder("What needs to be done?");
    await expect(input).toBeVisible();

    await input.fill("Buy groceries");
    await input.press("Enter");

    const todoText = page.locator(".todo span");
    await expect(todoText).toBeVisible();

    // Initially not struck through
    await expect(todoText).not.toHaveCSS(
      "text-decoration-line",
      "line-through"
    );

    // Click to toggle
    await page.locator(".todo").click();
    await expect(todoText).toHaveCSS("text-decoration-line", "line-through");
  });

  test("should untoggle a checked todo", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    const input = page.getByPlaceholder("What needs to be done?");
    await expect(input).toBeVisible();

    await input.fill("Buy groceries");
    await input.press("Enter");

    const todo = page.locator(".todo");
    const todoText = page.locator(".todo span");

    // Toggle on then off
    await todo.click();
    await expect(todoText).toHaveCSS("text-decoration-line", "line-through");

    await todo.click();
    await expect(todoText).not.toHaveCSS(
      "text-decoration-line",
      "line-through"
    );
  });

  test("should delete a todo", async ({ page }, testInfo) => {
    await page.goto(`/?exampleId=${roomId(testInfo)}`);
    const input = page.getByPlaceholder("What needs to be done?");
    await expect(input).toBeVisible();

    await input.fill("Buy groceries");
    await input.press("Enter");
    await input.fill("Walk the dog");
    await input.press("Enter");

    const todos = page.locator(".todo_container");
    await expect(todos).toHaveCount(2);

    // Delete the first todo
    await todos.nth(0).locator(".delete_button").click();

    await expect(todos).toHaveCount(1);
    await expect(todos.nth(0)).toContainText("Walk the dog");
  });

  test("should show typing indicator to other user", async (
    { page },
    testInfo
  ) => {
    const room = roomId(testInfo);
    const page2 = await page.context().newPage();

    await page.goto(`/?exampleId=${room}`);
    await page2.goto(`/?exampleId=${room}`);

    const input1 = page.getByPlaceholder("What needs to be done?");
    await expect(input1).toBeVisible();
    await expect(
      page2.getByPlaceholder("What needs to be done?")
    ).toBeVisible();

    // Type on page 1 — page 2 should see the typing indicator
    await input1.fill("Hello");

    await expect(page2.locator(".someone_is_typing")).toContainText(
      "Someone is typing"
    );

    await page2.close();
  });

  test("should sync a new todo to a second client", async (
    { page },
    testInfo
  ) => {
    const room = roomId(testInfo);
    const page2 = await page.context().newPage();

    await page.goto(`/?exampleId=${room}`);
    await page2.goto(`/?exampleId=${room}`);

    const input1 = page.getByPlaceholder("What needs to be done?");
    await expect(input1).toBeVisible();
    await expect(
      page2.getByPlaceholder("What needs to be done?")
    ).toBeVisible();

    // Add a todo on page 1
    await input1.fill("Synced todo");
    await input1.press("Enter");

    // Should appear on page 2
    const todosPage2 = page2.locator(".todo_container");
    await expect(todosPage2).toHaveCount(1);
    await expect(todosPage2.nth(0)).toContainText("Synced todo");

    await page2.close();
  });
});
