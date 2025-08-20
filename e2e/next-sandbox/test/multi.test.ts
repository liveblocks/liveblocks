import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  expectJson,
  genRoomId,
  getJson,
  pickFrom,
  preparePages,
  waitForJson,
} from "./utils";

test.describe("Multiple rooms (index)", () => {
  const TEST_URL = "http://localhost:3007/multi/";

  let pages: Page[];
  let roomPrefix: string;
  let roomSuffixCounter: number;

  const getUniqueRoomSuffix = () => `-${roomSuffixCounter++}`;

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    roomPrefix = `${room}-`;
    // Start counter from worker ID to ensure unique room suffixes across workers
    const workerId = testInfo.parallelIndex || 0;
    roomSuffixCounter = workerId * 100; // Give each worker a unique range
    pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(room)}&user=${workerId}`,
      { n: 1, width: 1024 } // Open only a single, but wider, browser window
    );
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("mount, unmount, connection ID must be incremented", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    await page.fill("#input_1", roomA);
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
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    await page.fill("#input_1", roomA);
    await page.click("#mount_1");

    // Initial mount
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");
    const initialConnId = (await getJson(page, "#connectionId_1")) as number;

    // Change while mounted
    await page.fill("#input_1", roomB);
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Change back
    await page.fill("#input_1", roomA);
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");

    await expectJson(page, "#connectionId_1", initialConnId + 1);
  });

  test("mount same room twice as siblings, change room, change room back, should retain connection ID", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    // Set up
    await page.click("#add-column");
    await page.fill("#input_1", roomA);
    await page.fill("#input_2", roomA);
    await page.click("#mount_1");
    await page.click("#mount_2");
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Both room instances should share the same connection ID
    const initialConnId = (await getJson(page, "#connectionId_1")) as number;
    await expectJson(page, "#connectionId_2", initialConnId);

    // Change while mounted
    await page.fill("#input_2", roomB);
    // await waitForJson(page, "#socketStatus_2", "connecting");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Change back
    await page.fill("#input_2", roomA);
    await waitForJson(page, "#socketStatus_2", "connected");

    await expectJson(page, "#connectionId_2", initialConnId);
  });

  test("mount same room twice, change room twice, should have same connection ID", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    // Set up
    await page.click("#add-column");
    await page.fill("#input_1", roomA);
    await page.fill("#input_2", roomA);
    await page.click("#mount_1");
    await page.click("#mount_2");
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Change while mounted
    await page.fill("#input_2", roomB);
    // await waitForJson(page, "#socketStatus_2", "connecting");
    await waitForJson(page, "#socketStatus_2", "connected");
    const connId = (await getJson(page, "#connectionId_2")) as number;

    // Change the other room instance as well
    await page.fill("#input_1", roomB);

    // They should share the same connection ID now
    await waitForJson(page, "#socketStatus_1", "connected");
    await expectJson(page, "#connectionId_1", connId);
  });

  test("mount same room 5 times, connection ID only changes after last instance is no longer mounted", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    await page.click("#mount_1");

    await page.click("#add-column");
    await page.click("#add-column");
    await page.click("#add-column");
    await page.click("#add-column");

    await page.fill("#input_1", roomA);
    await page.fill("#input_2", roomA);
    await page.fill("#input_3", roomA);
    await page.fill("#input_4", roomA);
    await page.fill("#input_5", roomA);

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
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    // Set up three levels of nesting
    await page.fill("#input_1", roomA);
    await page.click("#mount_1");
    await page.click("#nest_1");
    await page.fill("#input_1_1", roomA);
    await page.click("#mount_1_1");
    await page.click("#nest_1_1");
    await page.fill("#input_1_1_1", roomA);
    await page.click("#mount_1_1_1");

    await waitForJson(page, "#socketStatus_1_1_1", "connected");
    const connId = (await getJson(page, "#connectionId_1_1_1")) as number;

    await page.fill("#input_1", roomB);
    await page.fill("#input_1_1", roomB);
    await page.click("#inc_1_1_1"); // Trigger a re-render explicitly
    await expectJson(page, "#socketStatus_1_1_1", "connected"); // Check for regression -- socket should stay connected!
    await expectJson(page, "#connectionId_1_1_1", connId); // No change here

    await page.fill("#input_1", roomA);
    await page.click("#unmount_1");
    await page.click("#mount_1");

    await waitForJson(page, "#connectionId_1", connId + 1);
  });

  test("initialStorage value DOES get reevaluated if the room ID changes", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    // -----------------------
    // Test setup
    // -----------------------
    await page.click("#add-column");

    // Mount roomA first
    await page.fill("#input_1", roomA);
    await page.click("#mount_1");

    // Mount roomB second
    await page.fill("#input_2", roomB);
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

    // Set room ID to roomA
    await page.fill("#input_1", roomA);

    // Mount
    await page.click("#mount_1");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Ensure that, when initialRoom_1 equals the roomA value
    await expectJson(page, "#initialRoom_1", roomA);

    // Change room ID to roomB (without unmounting)
    await page.fill("#input_1", roomB);
    await waitForJson(page, "#socketStatus_1", "connected");

    // Ensure that, when initialRoom_1 equals the roomB value
    await expectJson(page, "#initialRoom_1", roomB);

    // Unmount
    await page.click("#unmount_1");
  });
});

test.describe("Multiple rooms (global augmentation)", () => {
  const TEST_URL = "http://localhost:3007/multi/with-global-augmentation";

  let pages: Page[];
  let roomPrefix: string;
  let roomSuffixCounter: number;

  const getUniqueRoomSuffix = () => roomSuffixCounter++;

  test.beforeEach(async ({}, testInfo) => {
    const room = genRoomId(testInfo);
    roomPrefix = `${room}-`;
    // Start counter from worker ID to ensure unique room suffixes across workers
    const workerId = testInfo.parallelIndex || 0;
    roomSuffixCounter = workerId * 100; // Give each worker a unique range
    pages = await preparePages(
      `${TEST_URL}?room=${encodeURIComponent(room)}&user=${workerId}`,
      { n: 1, width: 1024 } // Open only a single, but wider, browser window
    );
  });

  test.afterEach(() =>
    // Close all pages
    Promise.all(pages.map((page) => page.close()))
  );

  test("mount, unmount, connection ID must be incremented", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    await page.fill("#input_1", roomA);
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
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    await page.fill("#input_1", roomA);
    await page.click("#mount_1");

    // Initial mount
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");
    const initialConnId = (await getJson(page, "#connectionId_1")) as number;

    // Change while mounted
    await page.fill("#input_1", roomB);
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Change back
    await page.fill("#input_1", roomA);
    // await waitForJson(page, "#socketStatus_1", "connecting");
    await waitForJson(page, "#socketStatus_1", "connected");

    await expectJson(page, "#connectionId_1", initialConnId + 1);
  });

  test("mount same room twice as siblings, change room, change room back, should retain connection ID", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    // Set up
    await page.click("#add-column");
    await page.fill("#input_1", roomA);
    await page.fill("#input_2", roomA);
    await page.click("#mount_1");
    await page.click("#mount_2");
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Both room instances should share the same connection ID
    const initialConnId = (await getJson(page, "#connectionId_1")) as number;
    await expectJson(page, "#connectionId_2", initialConnId);

    // Change while mounted
    await page.fill("#input_2", roomB);
    // await waitForJson(page, "#socketStatus_2", "connecting");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Change back
    await page.fill("#input_2", roomA);
    await waitForJson(page, "#socketStatus_2", "connected");

    await expectJson(page, "#connectionId_2", initialConnId);
  });

  test("mount same room twice, change room twice, should have same connection ID", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    // Set up
    await page.click("#add-column");
    await page.fill("#input_1", roomA);
    await page.fill("#input_2", roomA);
    await page.click("#mount_1");
    await page.click("#mount_2");
    await waitForJson(page, "#socketStatus_1", "connected");
    await waitForJson(page, "#socketStatus_2", "connected");

    // Change while mounted
    await page.fill("#input_2", roomB);
    // await waitForJson(page, "#socketStatus_2", "connecting");
    await waitForJson(page, "#socketStatus_2", "connected");
    const connId = (await getJson(page, "#connectionId_2")) as number;

    // Change the other room instance as well
    await page.fill("#input_1", roomB);

    // They should share the same connection ID now
    await waitForJson(page, "#socketStatus_1", "connected");
    await expectJson(page, "#connectionId_1", connId);
  });

  test("mount same room 5 times, connection ID only changes after last instance is no longer mounted", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    await page.click("#mount_1");

    await page.click("#add-column");
    await page.click("#add-column");
    await page.click("#add-column");
    await page.click("#add-column");

    await page.fill("#input_1", roomA);
    await page.fill("#input_2", roomA);
    await page.fill("#input_3", roomA);
    await page.fill("#input_4", roomA);
    await page.fill("#input_5", roomA);

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
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    // Set up three levels of nesting
    await page.fill("#input_1", roomA);
    await page.click("#mount_1");
    await page.click("#nest_1");
    await page.fill("#input_1_1", roomA);
    await page.click("#mount_1_1");
    await page.click("#nest_1_1");
    await page.fill("#input_1_1_1", roomA);
    await page.click("#mount_1_1_1");

    await waitForJson(page, "#socketStatus_1_1_1", "connected");
    const connId = (await getJson(page, "#connectionId_1_1_1")) as number;

    await page.fill("#input_1", roomB);
    await page.fill("#input_1_1", roomB);
    await page.click("#inc_1_1_1"); // Trigger a re-render explicitly
    await expectJson(page, "#socketStatus_1_1_1", "connected"); // Check for regression -- socket should stay connected!
    await expectJson(page, "#connectionId_1_1_1", connId); // No change here

    await page.fill("#input_1", roomA);
    await page.click("#unmount_1");
    await page.click("#mount_1");

    await waitForJson(page, "#connectionId_1", connId + 1);
  });

  test("auth callback is always fresh", async () => {
    const page = pages[0];

    // Get the current render count and current echo value
    const initialRenderCount = await getJson(
      page,
      "#liveblocksProviderRenderCount"
    );

    await page.click("#mount_1");
    // Wait for connection to establish
    await waitForJson(page, "#socketStatus_1", "connected");

    // Get the echo value after mounting (this reflects the render count when auth was called)
    const initialEcho = await getJson(page, "#echo_1");

    // Clicking logout has no effect on the echo value, since no re-auth happens
    await page.click("#logout");
    await waitForJson(page, "#echo_1", initialEcho);

    // Things change when the top-level LiveblocksProvider is re-rendered.
    // This creates a new authEndpoint function instance.
    await page.click("#rerenderLiveblocksProvider");
    const newRenderCount = await getJson(
      page,
      "#liveblocksProviderRenderCount"
    );

    // Verify that the render count actually increased
    expect(newRenderCount).toBeGreaterThan(initialRenderCount as number);

    // Now when we logout, it should trigger re-authentication with the NEW render count
    await page.click("#logout");
    await waitForJson(page, "#echo_1", newRenderCount);
  });

  test("initialStorage value DOES get reevaluated if the room ID changes", async () => {
    const page = pages[0];
    const roomA = `${roomPrefix}-${getUniqueRoomSuffix()}`;
    const roomB = `${roomPrefix}-${getUniqueRoomSuffix()}`;

    // -----------------------
    // Test setup
    // -----------------------
    await page.click("#add-column");

    // Mount roomA first
    await page.fill("#input_1", roomA);
    await page.click("#mount_1");

    // Mount roomB second
    await page.fill("#input_2", roomB);
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

    // Set room ID to roomA
    await page.fill("#input_1", roomA);

    // Mount
    await page.click("#mount_1");
    await waitForJson(page, "#socketStatus_1", "connected");

    // Ensure that, when initialRoom_1 equals the roomA value
    await expectJson(page, "#initialRoom_1", roomA);

    // Change room ID to roomB (without unmounting)
    await page.fill("#input_1", roomB);
    await waitForJson(page, "#socketStatus_1", "connected");

    // Ensure that, when initialRoom_1 equals the roomB value
    await expectJson(page, "#initialRoom_1", roomB);

    // Unmount
    await page.click("#unmount_1");
  });
});
