import { pairwise } from "itertools";

import {
  byFirstCreated,
  byMostRecentlyUpdated,
  isMoreRecentlyUpdated,
  isNewer,
} from "../../lib/compare";

// A bunch of dates
const examples = [
  { createdAt: new Date("1999-01-01") },
  { createdAt: new Date("2024-01-01") },
  { createdAt: new Date("2010-01-01"), updatedAt: new Date("2024-05-05") },
  { createdAt: new Date("2024-01-02"), updatedAt: new Date("2024-03-03") },
  { createdAt: new Date("1999-01-02"), updatedAt: new Date("2000-01-06") },
];

describe("simple comparison checks", () => {
  it("sorts correctly using byFirstCreated", () => {
    expect([...examples].sort(byFirstCreated)).toEqual([
      { createdAt: new Date("1999-01-01") },
      { createdAt: new Date("1999-01-02"), updatedAt: new Date("2000-01-06") },
      { createdAt: new Date("2010-01-01"), updatedAt: new Date("2024-05-05") },
      { createdAt: new Date("2024-01-01") },
      { createdAt: new Date("2024-01-02"), updatedAt: new Date("2024-03-03") },
    ]);
  });

  it("sorts correctly using byMostRecentlyUpdated", () => {
    expect([...examples].sort(byMostRecentlyUpdated)).toEqual([
      { createdAt: new Date("2010-01-01"), updatedAt: new Date("2024-05-05") },
      { createdAt: new Date("2024-01-02"), updatedAt: new Date("2024-03-03") },
      { createdAt: new Date("2024-01-01") },
      { createdAt: new Date("1999-01-02"), updatedAt: new Date("2000-01-06") },
      { createdAt: new Date("1999-01-01") },
    ]);
  });

  it("isNewer on the same dates is false", () => {
    for (const t of examples) {
      expect(isNewer(t, t)).toBe(false);
    }
  });

  it("isMoreRecentlyUpdated on the same dates is false", () => {
    for (const t of examples) {
      expect(isMoreRecentlyUpdated(t, t)).toBe(false);
    }
  });

  it("isNewer works", () => {
    for (const [x, y] of pairwise([...examples].sort(byFirstCreated))) {
      expect(isNewer(y, x)).toBe(true);
      expect(isNewer(x, y)).toBe(false);
    }
  });

  it("isMoreRecentlyUpdated works", () => {
    for (const [x, y] of pairwise([...examples].sort(byMostRecentlyUpdated))) {
      expect(isMoreRecentlyUpdated(x, y)).toBe(true);
      expect(isMoreRecentlyUpdated(y, x)).toBe(false);
    }
  });
});
