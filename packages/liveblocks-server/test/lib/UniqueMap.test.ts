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

import { UniqueMap } from "~/lib/UniqueMap";

function keyFn(name: string): string {
  return name[0]!; // First letter must be unique
}

describe("unique map", () => {
  test("empty", () => {
    const umap = new UniqueMap(keyFn);
    expect(umap.size).toBe(0);
  });

  test("set", () => {
    const umap = new UniqueMap(keyFn);
    umap.set(1, "Alice");
    umap.set(2, "Bob");
    umap.set(3, "Clarisse");

    expect(umap.size).toEqual(3);
    expect([...umap]).toEqual([
      [1, "Alice"],
      [2, "Bob"],
      [3, "Clarisse"],
    ]);
  });

  test("get", () => {
    const umap = new UniqueMap(keyFn);
    umap.set(1, "Alice");
    umap.set(2, "Bob");
    umap.set(3, "Clarisse");

    expect(umap.get(1)).toEqual("Alice");
    expect(umap.get(2)).toEqual("Bob");
    expect(umap.get(3)).toEqual("Clarisse");
    expect(umap.get(4)).toEqual(undefined);
    expect(umap.get(5)).toEqual(undefined);
  });

  test("has", () => {
    const umap = new UniqueMap(keyFn);
    umap.set(1, "Alice");
    umap.set(2, "Bob");
    umap.set(3, "Clarisse");

    expect(umap.has(1)).toBe(true);
    expect(umap.has(2)).toBe(true);
    expect(umap.has(3)).toBe(true);
    expect(umap.has(4)).toBe(false);
    expect(umap.has(5)).toBe(false);
  });

  test("delete", () => {
    const umap = new UniqueMap(keyFn);
    umap.set(1, "Alice");
    umap.set(1, "Arthur");
    umap.delete(1);
    umap.set(1, "August");
    umap.set(2, "Beatrice");

    expect(umap.get(1)).toEqual("August");
    expect(umap.get(2)).toEqual("Beatrice");
    expect(umap.get(3)).toEqual(undefined);
    expect(umap.get(4)).toEqual(undefined);
  });

  test("size", () => {
    const umap = new UniqueMap(keyFn);
    umap.set(1, "Alice");
    umap.set(1, "Arthur");
    umap.set(1, "August");
    umap.set(2, "Beatrice");

    expect(umap.size).toBe(2);
  });

  test("overriding", () => {
    const umap = new UniqueMap(keyFn);
    umap.set(1, "Arthur");
    umap.set(1, "August"); // Overriding no problem
    umap.set(2, "Beatrice");
    umap.set(2, "Bob"); // Overriding no problem
    expect(umap.size).toBe(2);

    // But... overriding throws here! ❌
    expect(() => umap.set(1, "Bob")).toThrow("Unique key B already exists");

    // If we first delete key 2 however, it's fine
    umap.delete(2);
    umap.set(1, "Bob");

    expect(umap.size).toBe(1);
  });

  test("reverse lookup (key)", () => {
    const umap = new UniqueMap(keyFn);
    umap.set(1, "Alice");
    umap.set(1, "Arthur");
    umap.set(1, "August");
    umap.set(2, "Beatrice");
    umap.delete(2);
    umap.set(2, "Bubba");

    expect(umap.lookupPrimaryKey("A")).toBe(1);
    expect(umap.lookupPrimaryKey("B")).toBe(2);
    expect(umap.lookupPrimaryKey("C")).toBe(undefined);
  });

  test("reverse lookup (value)", () => {
    const umap = new UniqueMap(keyFn);
    umap.set(1, "Alice");
    umap.set(1, "Arthur");
    umap.set(1, "August");
    umap.set(2, "Beatrice");
    umap.delete(2);
    umap.set(2, "Bubba");

    expect(umap.lookup("A")).toBe("August");
    expect(umap.lookup("B")).toBe("Bubba");
    expect(umap.lookup("C")).toBe(undefined);
  });
});
