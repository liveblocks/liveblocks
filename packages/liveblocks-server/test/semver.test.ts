/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "vitest";

import { cmpSemver } from "../src/lib/semver";

describe("cmpSemver", () => {
  test("compares major versions", () => {
    expect(cmpSemver("2.0.0", "3.0.0")).toBeLessThan(0);
    expect(cmpSemver("3.0.0", "2.0.0")).toBeGreaterThan(0);
  });

  test("compares minor versions", () => {
    expect(cmpSemver("3.13.0", "3.14.0")).toBeLessThan(0);
    expect(cmpSemver("3.14.0", "3.13.0")).toBeGreaterThan(0);
  });

  test("compares patch versions", () => {
    expect(cmpSemver("3.14.0", "3.14.1")).toBeLessThan(0);
    expect(cmpSemver("3.14.1", "3.14.0")).toBeGreaterThan(0);
  });

  test("treats equal versions as equal", () => {
    expect(cmpSemver("3.14.0", "3.14.0")).toBe(0);
  });

  test("a final release outranks any of its prereleases", () => {
    expect(cmpSemver("3.14.0", "3.14.0-rc1")).toBeGreaterThan(0);
    expect(cmpSemver("3.14.0-rc1", "3.14.0")).toBeLessThan(0);
  });

  test("compares prereleases lexically", () => {
    expect(cmpSemver("3.14.0-rc1", "3.14.0-rc2")).toBeLessThan(0);
    expect(cmpSemver("3.14.0-rc2", "3.14.0-rc1")).toBeGreaterThan(0);
    expect(cmpSemver("3.14.0-rc1", "3.14.0-rc1")).toBe(0);
  });

  test("treats a missing patch component as 0", () => {
    // "3.21" and "3.21.0" are equivalent thresholds
    expect(cmpSemver("3.21", "3.21.0")).toBe(0);
    expect(cmpSemver("3.21", "3.20.0")).toBeGreaterThan(0);
    expect(cmpSemver("3.21", "3.22.0")).toBeLessThan(0);
  });

  test("the comparison is sign-consistent when operands swap", () => {
    expect(cmpSemver("3.19.5", "3.21.0")).toBeLessThan(0);
    expect(cmpSemver("3.21.0", "3.19.5")).toBeGreaterThan(0);
  });
});
