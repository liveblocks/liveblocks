import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  getJson,
  pickFrom,
  preparePages,
  waitForJson,
} from "./utils";

// NOTE: The tests below don't play well with concurrency just yet. The reason
// is that they unmount, remount, and then check that the connection ID
// increased by exactly one. This is not super robust. What matters is that the
// connection ID increased, but if it increased by more than 1, that could also
// be just fine. Better to express the conditional like that. For now, just not
// run them concurrently to avoid it.
// test.describe.configure({ mode: "parallel" });

test.describe("Multiple rooms (index)", () => {
  const TEST_URL = "http://localhost:3007/multi/";

  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(room)}`,
      { n: 1, width: 1024 } // Open only a single, but wider, browser window
    );
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("mount, unmount, connection ID must be incremented", async () => {
    const page = pages[0];

    await page.fill("#input_1", "e2e:multi-A");
    await page.click("#mount_1");

    await waitForJson(page, "#socketStatus_1", "connected");
    const connId = (await getJson(page, "#connectionId_1")) as number;

    await page.click("#unmount_1");
    await page.click("#mount_1");
    await waitForJson(page, "#socketStatus_1", "connected");

    await expectJson(page, "#connectionId_1", connId + 1);
  });

  test("mount, change room, change room back", async () => {
    const page = pages[0];

    await page.fill("#input_1", "e2e:multi-A");
    await page.click("#mount_1");

    // Initial mount
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");
    const initialConnId = (await getJson(page, "#connectionId_1")) as number;

    // Change while mounted
    await page.fill("#input_1", "e2e:multi-B");
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Change back
    await page.fill("#input_1", "e2e:multi-A");
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");

    await expectJson(page, "#connectionId_1", initialConnId + 1);
  });

  test("mount same room twice as siblings, change room, change room back, should retain connection ID", async () => {
    const page = pages[0];

    // Set up
    await page.click("#add-column");
    await page.fill("#input_1", "e2e:multi-A");
    await page.fill("#input_2", "e2e:multi-A");
    await page.click("#mount_1");
    await page.click("#mount_2");
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Both room instances should share the same connection ID
    const initialConnId = (await getJson(page, "#connectionId_1")) as number;
    await expectJson(page, "#connectionId_2", initialConnId);

    // Change while mounted
    await page.fill("#input_2", "e2e:multi-B");
    // await waitForJson(page, "#socketStatus_2", "connecting");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Change back
    await page.fill("#input_2", "e2e:multi-A");
    await waitForJson(page, "#socketStatus_2", "connected");

    await expectJson(page, "#connectionId_2", initialConnId);
  });

  test("mount same room twice, change room twice, should have same connection ID", async () => {
    const page = pages[0];

    // Set up
    await page.click("#add-column");
    await page.fill("#input_1", "e2e:multi-A");
    await page.fill("#input_2", "e2e:multi-A");
    await page.click("#mount_1");
    await page.click("#mount_2");
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Change while mounted
    await page.fill("#input_2", "e2e:multi-B");
    // await waitForJson(page, "#socketStatus_2", "connecting");
    await waitForJson(page, "#socketStatus_2", "connected");
    const connId = (await getJson(page, "#connectionId_2")) as number;

    // Change the other room instance as well
    await page.fill("#input_1", "e2e:multi-B");

    // They should share the same connection ID now
    await waitForJson(page, "#socketStatus_1", "connected");
    await expectJson(page, "#connectionId_1", connId);
  });

  test("mount same room 5 times, connection ID only changes after last instance is no longer mounted", async () => {
    const page = pages[0];

    await page.click("#mount_1");

    await page.click("#add-column");
    await page.click("#add-column");
    await page.click("#add-column");
    await page.click("#add-column");

    await page.fill("#input_1", "e2e:multi-A");
    await page.fill("#input_2", "e2e:multi-A");
    await page.fill("#input_3", "e2e:multi-A");
    await page.fill("#input_4", "e2e:multi-A");
    await page.fill("#input_5", "e2e:multi-A");

    // Set up
    await page.click("#mount_2");
    await page.click("#mount_3");
    await page.click("#mount_4");
    await page.click("#mount_5");

    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");
    await waitForJson(page, "#socketStatus_3", "connected");
    await waitForJson(page, "#socketStatus_4", "connected");
    await waitForJson(page, "#socketStatus_5", "connected");

    // They should all have the same connection ID
    const connId = (await getJson(page, "#connectionId_1")) as number;
    await expectJson(page, "#connectionId_1", connId);
    await expectJson(page, "#connectionId_2", connId);
    await expectJson(page, "#connectionId_3", connId);
    await expectJson(page, "#connectionId_4", connId);
    await expectJson(page, "#connectionId_5", connId);

    // Reconnecting one at random will cause all instances to get a new (but
    // the same!) connection ID
    await page.click(
      pickFrom([
        "#reconnect_1",
        "#reconnect_2",
        "#reconnect_3",
        "#reconnect_4",
        "#reconnect_5",
      ])
    );

    // They should all have the same connection ID
    await waitForJson(page, "#connectionId_1", connId + 1);
    await expectJson(page, "#connectionId_2", connId + 1);
    await expectJson(page, "#connectionId_3", connId + 1);
    await expectJson(page, "#connectionId_4", connId + 1);
    await expectJson(page, "#connectionId_5", connId + 1);

    await page.click("#remove-column");
    await page.click("#remove-column");
    await page.click("#remove-column");
    await page.click("#remove-column");
    await page.click("#unmount_1");
    await page.click("#mount_1");

    // Only now should the connection ID have been incremented
    await waitForJson(page, "#socketStatus_1", "connected");
    await expectJson(page, "#connectionId_1", connId + 2);
  });

  test("nested room providers", async () => {
    const page = pages[0];

    // Set up three levels of nesting
    await page.fill("#input_1", "e2e:multi-A");
    await page.click("#mount_1");
    await page.click("#nest_1");
    await page.fill("#input_1_1", "e2e:multi-A");
    await page.click("#mount_1_1");
    await page.click("#nest_1_1");
    await page.fill("#input_1_1_1", "e2e:multi-A");
    await page.click("#mount_1_1_1");

    await waitForJson(page, "#socketStatus_1_1_1", "connected");
    const connId = (await getJson(page, "#connectionId_1_1_1")) as number;

    await page.fill("#input_1", "e2e:multi-B");
    await page.fill("#input_1_1", "e2e:multi-B");
    await page.click("#inc_1_1_1"); // Trigger a re-render explicitly
    await expectJson(page, "#socketStatus_1_1_1", "connected"); // Check for regression -- socket should stay connected!
    await expectJson(page, "#connectionId_1_1_1", connId); // No change here

    await page.fill("#input_1", "e2e:multi-A");
    await page.click("#unmount_1");
    await page.click("#mount_1");

    await waitForJson(page, "#connectionId_1", connId + 1);
  });

  test("initialStorage value DOES get reevaluated if the room ID changes", async () => {
    const page = pages[0];

    // -----------------------
    // Test setup
    // -----------------------
    await page.click("#add-column");

    // Mount "e2e-multi-234" first
    await page.fill("#input_1", "e2e-multi-234");
    await page.click("#mount_1");

    // Mount "e2e-multi-567" second
    await page.fill("#input_2", "e2e-multi-567");
    await page.click("#mount_2");

    // Wait for connections
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Hit "Clear" on both
    await page.click("#clear_1");
    await page.click("#clear_2");

    // Unmount both
    await page.click("#unmount_1");
    await page.click("#unmount_2");

    // "Remove column"
    await page.click("#remove-column");

    // -----------------------
    // Start of actual test
    // -----------------------

    // Set room ID to "e2e-multi-234"
    await page.fill("#input_1", "e2e-multi-234");

    // Mount
    await page.click("#mount_1");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Ensure that, when initialRoom_1 equals the "e2e-multi-234" value
    await expectJson(page, "#initialRoom_1", "e2e-multi-234");

    // Change room ID to "e2e-multi-567" (without unmounting)
    await page.fill("#input_1", "e2e-multi-567");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Ensure that, when initialRoom_1 equals the "e2e-multi-567" value
    await expectJson(page, "#initialRoom_1", "e2e-multi-567");

    // Unmount
    await page.click("#unmount_1");
  });
});

test.describe("Multiple rooms (global augmentation)", () => {
  const TEST_URL = "http://localhost:3007/multi/with-global-augmentation";

  let pages: Page[];

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(room)}`,
      { n: 1, width: 1024 } // Open only a single, but wider, browser window
    );
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("mount, unmount, connection ID must be incremented", async () => {
    const page = pages[0];

    await page.fill("#input_1", "e2e:multi-A");
    await page.click("#mount_1");

    await waitForJson(page, "#socketStatus_1", "connected");
    const connId = (await getJson(page, "#connectionId_1")) as number;

    await page.click("#unmount_1");
    await page.click("#mount_1");
    await waitForJson(page, "#socketStatus_1", "connected");

    await expectJson(page, "#connectionId_1", connId + 1);
  });

  test("mount, change room, change room back", async () => {
    const page = pages[0];

    await page.fill("#input_1", "e2e:multi-A");
    await page.click("#mount_1");

    // Initial mount
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");
    const initialConnId = (await getJson(page, "#connectionId_1")) as number;

    // Change while mounted
    await page.fill("#input_1", "e2e:multi-B");
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Change back
    await page.fill("#input_1", "e2e:multi-A");
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");

    await expectJson(page, "#connectionId_1", initialConnId + 1);
  });

  test("mount same room twice as siblings, change room, change room back, should retain connection ID", async () => {
    const page = pages[0];

    // Set up
    await page.click("#add-column");
    await page.fill("#input_1", "e2e:multi-A");
    await page.fill("#input_2", "e2e:multi-A");
    await page.click("#mount_1");
    await page.click("#mount_2");
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Both room instances should share the same connection ID
    const initialConnId = (await getJson(page, "#connectionId_1")) as number;
    await expectJson(page, "#connectionId_2", initialConnId);

    // Change while mounted
    await page.fill("#input_2", "e2e:multi-B");
    // await waitForJson(page, "#socketStatus_2", "connecting");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Change back
    await page.fill("#input_2", "e2e:multi-A");
    await waitForJson(page, "#socketStatus_2", "connected");

    await expectJson(page, "#connectionId_2", initialConnId);
  });

  test("mount same room twice, change room twice, should have same connection ID", async () => {
    const page = pages[0];

    // Set up
    await page.click("#add-column");
    await page.fill("#input_1", "e2e:multi-A");
    await page.fill("#input_2", "e2e:multi-A");
    await page.click("#mount_1");
    await page.click("#mount_2");
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Change while mounted
    await page.fill("#input_2", "e2e:multi-B");
    // await waitForJson(page, "#socketStatus_2", "connecting");
    await waitForJson(page, "#socketStatus_2", "connected");
    const connId = (await getJson(page, "#connectionId_2")) as number;

    // Change the other room instance as well
    await page.fill("#input_1", "e2e:multi-B");

    // They should share the same connection ID now
    await waitForJson(page, "#socketStatus_1", "connected");
    await expectJson(page, "#connectionId_1", connId);
  });

  test("mount same room 5 times, connection ID only changes after last instance is no longer mounted", async () => {
    const page = pages[0];

    await page.click("#mount_1");

    await page.click("#add-column");
    await page.click("#add-column");
    await page.click("#add-column");
    await page.click("#add-column");

    await page.fill("#input_1", "e2e:multi-A");
    await page.fill("#input_2", "e2e:multi-A");
    await page.fill("#input_3", "e2e:multi-A");
    await page.fill("#input_4", "e2e:multi-A");
    await page.fill("#input_5", "e2e:multi-A");

    // Set up
    await page.click("#mount_2");
    await page.click("#mount_3");
    await page.click("#mount_4");
    await page.click("#mount_5");

    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");
    await waitForJson(page, "#socketStatus_3", "connected");
    await waitForJson(page, "#socketStatus_4", "connected");
    await waitForJson(page, "#socketStatus_5", "connected");

    // They should all have the same connection ID
    const connId = (await getJson(page, "#connectionId_1")) as number;
    await expectJson(page, "#connectionId_1", connId);
    await expectJson(page, "#connectionId_2", connId);
    await expectJson(page, "#connectionId_3", connId);
    await expectJson(page, "#connectionId_4", connId);
    await expectJson(page, "#connectionId_5", connId);

    // Reconnecting one at random will cause all instances to get a new (but
    // the same!) connection ID
    await page.click(
      pickFrom([
        "#reconnect_1",
        "#reconnect_2",
        "#reconnect_3",
        "#reconnect_4",
        "#reconnect_5",
      ])
    );

    // They should all have the same connection ID
    await waitForJson(page, "#connectionId_1", connId + 1);
    await expectJson(page, "#connectionId_2", connId + 1);
    await expectJson(page, "#connectionId_3", connId + 1);
    await expectJson(page, "#connectionId_4", connId + 1);
    await expectJson(page, "#connectionId_5", connId + 1);

    await page.click("#remove-column");
    await page.click("#remove-column");
    await page.click("#remove-column");
    await page.click("#remove-column");
    await page.click("#unmount_1");
    await page.click("#mount_1");

    // Only now should the connection ID have been incremented
    await waitForJson(page, "#socketStatus_1", "connected");
    await expectJson(page, "#connectionId_1", connId + 2);
  });

  test("nested room providers", async () => {
    const page = pages[0];

    // Set up three levels of nesting
    await page.fill("#input_1", "e2e:multi-A");
    await page.click("#mount_1");
    await page.click("#nest_1");
    await page.fill("#input_1_1", "e2e:multi-A");
    await page.click("#mount_1_1");
    await page.click("#nest_1_1");
    await page.fill("#input_1_1_1", "e2e:multi-A");
    await page.click("#mount_1_1_1");

    await waitForJson(page, "#socketStatus_1_1_1", "connected");
    const connId = (await getJson(page, "#connectionId_1_1_1")) as number;

    await page.fill("#input_1", "e2e:multi-B");
    await page.fill("#input_1_1", "e2e:multi-B");
    await page.click("#inc_1_1_1"); // Trigger a re-render explicitly
    await expectJson(page, "#socketStatus_1_1_1", "connected"); // Check for regression -- socket should stay connected!
    await expectJson(page, "#connectionId_1_1_1", connId); // No change here

    await page.fill("#input_1", "e2e:multi-A");
    await page.click("#unmount_1");
    await page.click("#mount_1");

    await waitForJson(page, "#connectionId_1", connId + 1);
  });

  test("auth callback is always fresh", async () => {
    const page = pages[0];

    const initialRenderCount = await getJson(
      page,
      "#liveblocksProviderRenderCount"
    );

    await page.click("#mount_1");
    await waitForJson(page, "#echo_1", initialRenderCount);

    // Clicking logout has no effect, unless the top level
    await page.click("#logout");
    await waitForJson(page, "#echo_1", initialRenderCount);

    // Things change when the top-level LiveblocksProvider is re-rendered.
    // If that happens, a new authEndpoint function _instance_ should get
    // invoked after pressing logout.
    await page.click("#rerenderLiveblocksProvider");
    const newRenderCount = await getJson(
      page,
      "#liveblocksProviderRenderCount"
    );
    await page.click("#logout");
    await waitForJson(page, "#echo_1", newRenderCount);
  });

  // test("initialStorage value DOES NOT get reevaluated beyond the first value", async () => {
  //   ...
  // });

  test("initialStorage value DOES get reevaluated if the room ID changes", async () => {
    const page = pages[0];

    // -----------------------
    // Test setup
    // -----------------------
    await page.click("#add-column");

    // Mount "e2e-multi-234" first
    await page.fill("#input_1", "e2e-multi-234");
    await page.click("#mount_1");

    // Mount "e2e-multi-567" second
    await page.fill("#input_2", "e2e-multi-567");
    await page.click("#mount_2");

    // Wait for connections
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Hit "Clear" on both
    await page.click("#clear_1");
    await page.click("#clear_2");

    // Unmount both
    await page.click("#unmount_1");
    await page.click("#unmount_2");

    // "Remove column"
    await page.click("#remove-column");

    // -----------------------
    // Start of actual test
    // -----------------------

    // Set room ID to "e2e-multi-234"
    await page.fill("#input_1", "e2e-multi-234");

    // Mount
    await page.click("#mount_1");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Ensure that, when initialRoom_1 equals the "e2e-multi-234" value
    await expectJson(page, "#initialRoom_1", "e2e-multi-234");

    // Change room ID to "e2e-multi-567" (without unmounting)
    await page.fill("#input_1", "e2e-multi-567");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Ensure that, when initialRoom_1 equals the "e2e-multi-567" value
    await expectJson(page, "#initialRoom_1", "e2e-multi-567");

    // Unmount
    await page.click("#unmount_1");
  });
});
