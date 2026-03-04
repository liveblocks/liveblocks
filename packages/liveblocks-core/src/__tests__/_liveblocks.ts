/**
 * Test utilities for running @liveblocks/core unit tests against the real
 * local dev server at localhost:1154.
 */
import { nanoid } from "../lib/nanoid";
import { wait } from "../lib/utils";

export function randomRoomId(): string {
  return `room-${nanoid()}`;
}

export async function waitFor(predicate: () => boolean): Promise<void> {
  const result = predicate();
  if (result) {
    return;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < 2000) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw new Error("TIMEOUT");
}
