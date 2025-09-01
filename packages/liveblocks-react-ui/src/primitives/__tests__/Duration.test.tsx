import { describe, expect, test } from "vitest";

import { formatIso8601Duration } from "../Duration";

describe("formatIso8601Duration", () => {
  test("should format durations as ISO 8601", () => {
    expect(formatIso8601Duration(-100)).toBe("PT0S");
    expect(formatIso8601Duration(0)).toBe("PT0S");
    expect(formatIso8601Duration(100)).toBe("PT0.1S");
    expect(formatIso8601Duration(1000)).toBe("PT1S");
    expect(formatIso8601Duration(10000)).toBe("PT10S");
    expect(formatIso8601Duration(100000)).toBe("PT1M40S");
    expect(formatIso8601Duration(1000000)).toBe("PT16M40S");
    expect(formatIso8601Duration(10000000)).toBe("PT2H46M40S");
    expect(formatIso8601Duration(100000000)).toBe("P1DT3H46M40S");
    expect(formatIso8601Duration(1000000000)).toBe("P1W4DT13H46M40S");
    expect(formatIso8601Duration(10000000000)).toBe("P16W3DT17H46M40S");
  });
});
