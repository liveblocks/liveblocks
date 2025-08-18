import { describe, expect, test } from "vitest";

import { formatFileSize } from "../utils/format-file-size";

const BASE = 1000;

describe("formatFileSize", () => {
  test.each([
    [0, "0 KB"],
    [1, "0.01 KB"],
    [4, "0.01 KB"],
    [10, "0.01 KB"],
    [40, "0.04 KB"],
    [102, "0.1 KB"],
    [500, "0.5 KB"],
    [920, "0.9 KB"],
    [BASE, "1 KB"],
    [9.5 * BASE, "9.5 KB"],
    [10 * BASE, "10 KB"],
    [106.8 * BASE, "107 KB"],
    [865.4 * BASE, "865 KB"],
    [BASE * BASE, "1 MB"],
    [16.2 * BASE * BASE, "16.2 MB"],
    [BASE * BASE * BASE, "1 GB"],
    [32.5 * BASE * BASE * BASE, "32.5 GB"],
    [1124 * BASE * BASE * BASE, "1,124 GB"],
  ])("should format %d bytes as %s", (size, expected) => {
    expect(formatFileSize(size, "en-US")).toBe(expected);
  });
});
