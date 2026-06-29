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

/**
 * Compares two semver-ish version strings (`major.minor.patch` with an optional
 * `-prerelease` suffix). Returns a negative number if `a < b`, a positive number
 * if `a > b`, and `0` if they're equal.
 *
 * Missing numeric components are treated as `0`, so `"3.21"` and `"3.21.0"`
 * compare equal. A final release outranks any of its prereleases
 * (`"3.14.0" > "3.14.0-rc1"`); prereleases are otherwise compared lexically.
 */
export function cmpSemver(a: string, b: string): number {
  const [coreA = "", preA] = a.split("-", 2);
  const [coreB = "", preB] = b.split("-", 2);
  const partsA = coreA.split(".").map(Number);
  const partsB = coreB.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const pa = partsA[i] ?? 0;
    const pb = partsB[i] ?? 0;
    if (pa !== pb) return pa - pb;
  }
  // A final release outranks any of its prereleases (3.14.0 > 3.14.0-rc1)
  if (!preA && preB) return 1;
  if (preA && !preB) return -1;
  if (preA && preB) return preA < preB ? -1 : preA > preB ? 1 : 0;
  return 0;
}
