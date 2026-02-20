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

import { describe, expect, test } from "bun:test";

import { cmpSemver, highestVersion } from "~/upgrade/index";

describe("compareSemver", () => {
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

  test("equal versions", () => {
    expect(cmpSemver("3.14.0", "3.14.0")).toBe(0);
  });

  test("release > prerelease", () => {
    expect(cmpSemver("3.14.0", "3.14.0-rc1")).toBeGreaterThan(0);
    expect(cmpSemver("3.14.0-rc1", "3.14.0")).toBeLessThan(0);
  });

  test("compares prerelease strings", () => {
    expect(cmpSemver("3.14.0-rc1", "3.14.0-rc2")).toBeLessThan(0);
    expect(cmpSemver("3.14.0-rc2", "3.14.0-rc1")).toBeGreaterThan(0);
    expect(cmpSemver("3.14.0-rc1", "3.14.0-rc1")).toBe(0);
  });
});

describe("pickHighestVersion", () => {
  // Simulates: npm view @liveblocks/core@latest version --json
  // Single match → npm returns a plain string
  test("single version string (e.g. @latest)", () => {
    expect(highestVersion("3.14.0")).toBe("3.14.0");
  });

  // Simulates: npm view @liveblocks/core@rc version --json
  test("single prerelease version string (e.g. @rc)", () => {
    expect(highestVersion("3.14.0-rc2")).toBe("3.14.0-rc2");
  });

  // Simulates: npm view @liveblocks/core@3.14 version --json
  // Single match → npm returns a plain string
  test("single match for partial version (e.g. @3.14)", () => {
    expect(highestVersion("3.14.0")).toBe("3.14.0");
  });

  // Simulates: npm view @liveblocks/core@3 version --json
  // Multiple matches, sorted by publish time (NOT semver).
  // Includes a 2.x hotfix published after 3.x versions.
  test("multiple versions with out-of-order hotfix (e.g. @3)", () => {
    const versions = [
      "3.0.0",
      "3.1.0",
      "3.1.1",
      "3.1.2",
      "3.1.3",
      "3.1.4",
      "3.2.0",
      "3.2.1",
      "3.3.0",
      "3.3.1",
      "3.3.2",
      "3.3.3",
      "3.3.4",
      "3.4.0",
      "3.4.1",
      "3.4.2",
      "3.5.0",
      "3.5.1",
      "3.5.2",
      "3.5.3",
      "3.5.4",
      "3.6.0",
      "3.6.1",
      "3.6.2",
      "3.7.0",
      "3.7.1",
      "3.8.0",
      "3.8.1",
      "3.9.0",
      "3.9.1",
      "3.9.2",
      "3.10.0",
      "3.10.1",
      "3.11.0",
      "3.11.1",
      "3.12.0",
      "3.12.1",
      "3.13.0",
      "3.13.1",
      "3.13.2",
      "3.13.3",
      "3.13.4",
      "3.13.5",
      "3.14.0", // should win over -rc ones
      "3.14.0-rc1",
      "3.14.0-rc2",
    ];
    expect(highestVersion(versions)).toBe("3.14.0");
  });

  // Simulates: npm view '@liveblocks/core@<3.1' version --json
  // The 2.24.4 hotfix was published after 3.0.0, so it appears out of order.
  test("range with out-of-order hotfix at the end (e.g. @<3.1)", () => {
    const versions = [
      "0.18.3",
      "0.18.4",
      "0.18.5",
      "1.0.0",
      "1.0.1",
      "1.12.0",
      "2.0.0",
      "2.24.3",
      "3.0.0",
      "2.24.4", // hotfix published after 3.0.0
    ];
    expect(highestVersion(versions)).toBe("3.0.0");
  });

  test("throws on empty array", () => {
    expect(() => highestVersion([])).toThrow("No versions found");
  });
});
