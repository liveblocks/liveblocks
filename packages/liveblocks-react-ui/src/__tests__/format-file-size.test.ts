import { formatFileSize } from "../utils/format-file-size";

describe("formatFileSize", () => {
  test.each([
    [0, "0 KB"],
    [500, "0.5 KB"],
    [950, "0.9 KB"],
    [1024, "1 KB"],
    [106.8 * 1024, "106.8 KB"],
    [1024 * 1024, "1 MB"],
    [16.2 * 1024 * 1024, "16.2 MB"],
    [1024 * 1024 * 1024, "1 GB"],
    [32.5 * 1024 * 1024 * 1024, "32.5 GB"],
    [1124 * 1024 * 1024 * 1024, "1,124 GB"],
  ])("should format file size %d bytes", (size, expected) => {
    expect(formatFileSize(size, "en-US")).toBe(expected);
  });
});
