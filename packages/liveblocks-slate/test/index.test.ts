import { randomUUID } from "crypto";
import { createEditor, Editor } from "slate";
import { fixtures } from "./fixtures";
import {
  setupTestRoom,
  wait,
  waitForLiveRootChange,
  waitForStorageSync,
  withCollaborativeTestPlugins,
  withTestingElements,
} from "./utils";

export type FixtureModule = {
  module: {
    input: Editor;
    expected: Editor;
    run: (e: Editor) => void;
  };
};

async function runCollaborationTest({ module }: FixtureModule) {
  // Setup 'local' editor
  const { input, run, expected } = module;
  const initialValue = input.children;

  const roomId = randomUUID();
  const room = await setupTestRoom(roomId, { initialValue });
  const editor = await withCollaborativeTestPlugins(input, room);

  // The normalized editor state should match the shared root.
  expect(editor.liveRoot.toImmutable()).toEqual(editor.children);

  // Setup remote editor
  const remote = await withCollaborativeTestPlugins(
    createEditor(),
    await setupTestRoom(roomId)
  );

  // Perform changes
  run(editor);

  // Ensure all changes are committed.
  await waitForStorageSync(editor);

  // Editor state after run should match shared root.
  expect(editor.liveRoot.toImmutable()).toEqual(editor.children);

  // Wait for remote to receive changes.
  await waitForLiveRootChange(remote);

  await wait();

  // Verify remote and editor state are equal and match their respective liveRoots
  expect(remote.liveRoot.toImmutable()).toEqual(remote.children);
  expect(editor.liveRoot.toImmutable()).toEqual(editor.children);
  expect(editor.children).toEqual(remote.children);

  // Verify editor is in expected state
  const expectedEditor = withTestingElements(expected);
  Editor.normalize(expectedEditor, { force: true });
  expect(editor.children).toEqual(expectedEditor.children);
}

describe("adapter", () => {
  fixtures(__dirname, "collaboration", runCollaborationTest);
});
