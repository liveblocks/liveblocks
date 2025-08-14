import { describe, expect, test } from "vitest";

import { autoRetry } from "../autoRetry";

function makeFailThreeTimes() {
  let call = 0;
  return () => {
    call++;
    if (call <= 3) {
      return Promise.reject(new Error(`Failed call ${call}`));
    }
    return Promise.resolve(`Success ${call}`);
  };
}

describe("auto-retry logic", () => {
  test("works", async () => {
    let failThreeTimes = makeFailThreeTimes();
    await expect(autoRetry(failThreeTimes, 1, [])).rejects.toThrow(
      "Failed after 1 attempts: Error: Failed call 1"
    );

    failThreeTimes = makeFailThreeTimes();
    await expect(autoRetry(failThreeTimes, 2, [])).rejects.toThrow(
      "Failed after 2 attempts: Error: Failed call 2"
    );

    failThreeTimes = makeFailThreeTimes();
    await expect(autoRetry(failThreeTimes, 3, [])).rejects.toThrow(
      "Failed after 3 attempts: Error: Failed call 3"
    );

    failThreeTimes = makeFailThreeTimes();
    await expect(autoRetry(failThreeTimes, 4, [])).resolves.toEqual(
      "Success 4"
    );

    failThreeTimes = makeFailThreeTimes();
    await expect(autoRetry(failThreeTimes, 10, [])).resolves.toEqual(
      "Success 4"
    );
  });
});
