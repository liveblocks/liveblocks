const TIMEOUT = 60 * 1000;

const URL = "https://liveblocks.io/examples/todo-list?room=e2e-" + Date.now();

describe("liveblocks.io / todo-list example", () => {
  test(
    "creating a todo on page A should appear on page B",
    async () => {
      /**
       * By default, puppeteer.launch opens a window with a single tab so we use it here.
       * It's also possible to open a new page and close it for each test with beforeEach / afterEach.
       */
      const pageA = await getFirstTab(browsers[0]);
      const pageB = await getFirstTab(browsers[1]);

      for (const page of [pageA, pageB]) {
        await page.goto(URL);
        // Close an overlay that we have on all our examples
        await page.click("#close-example-info");
      }

      // The input appears once the todo list is loaded
      const input = await pageA.waitForSelector("input");

      // Types some text and press enter to create a todo
      await input.type("Do a blog post about puppeteer & jest\n", {
        delay: 50, // This slows down the typing
      });

      // Validate text of the first todo
      expect(await getTextContent(pageB, "#todo-0")).toBe(
        "Do a blog post about puppeteer & jest"
      );

      // waiting for the sake of the demo
      await wait(1000);

      // cleanup
      await pageA.click("#delete-todo-0");

      // waiting for the sake of the demo
      await wait(1000);
    },
    TIMEOUT
  );
});

async function getTextContent(page, selector) {
  const element = await page.waitForSelector(selector);
  return await element.evaluate((el) => el.textContent);
}

async function getFirstTab(browser) {
  const [firstTab] = await browser.pages();
  return firstTab;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
