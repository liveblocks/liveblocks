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

import type { SerializedCrdt } from "@liveblocks/core";
import { CrdtType } from "@liveblocks/core";
import { integer, number, string } from "decoders";
import { describe, expect, test } from "vitest";

import { makeMetadataDB } from "~/MetadataDB";
import { makeNewInMemoryDriver } from "~/plugins/InMemoryDriver";

const rounded = number.transform((n) => Math.round(n));

describe("test in-memory driver", () => {
  test("basic", () => {
    const driver = makeNewInMemoryDriver();
    const metadataDB = makeMetadataDB(driver);
    expect(metadataDB.get("foo")).toEqual(undefined);
    // Before loading, root node should not exist
    expect(new Map(driver.raw_iter_nodes())).toEqual(new Map());
    // After loading, root node should exist
    expect(new Map<string, SerializedCrdt>(driver.iter_nodes())).toEqual(
      new Map([["root", { type: CrdtType.OBJECT, data: {} }]])
    );
  });

  test("put and get are async", () => {
    const driver = makeNewInMemoryDriver();
    const metadataDB = makeMetadataDB(driver);
    expect(metadataDB.get("foo")).toEqual(undefined);
    metadataDB.put("foo", "bar");
    expect(metadataDB.get("foo")).toEqual("bar");
  });

  test("getters with decoders", () => {
    const driver = makeNewInMemoryDriver();
    const metadataDB = makeMetadataDB(driver);
    metadataDB.put("foo", "hi");
    expect(metadataDB.get("foo")).toEqual("hi");
    expect(metadataDB.get(number, "foo")).toEqual(undefined);
    expect(metadataDB.get(rounded, "foo")).toEqual(undefined);
    expect(metadataDB.get(string, "foo")).toEqual("hi");

    // Override
    metadataDB.put("foo", 123);
    expect(metadataDB.get("foo")).toEqual(123);
    expect(metadataDB.get(number, "foo")).toEqual(123);
    expect(metadataDB.get(integer, "foo")).toEqual(123);
    expect(metadataDB.get(rounded, "foo")).toEqual(123);
    expect(metadataDB.get(string, "foo")).toEqual(undefined);

    metadataDB.put("foo", 3.999);
    expect(metadataDB.get("foo")).toEqual(3.999);
    expect(metadataDB.get(number, "foo")).toEqual(3.999);
    expect(metadataDB.get(integer, "foo")).toEqual(undefined);
    expect(metadataDB.get(rounded, "foo")).toEqual(4);
    expect(metadataDB.get(string, "foo")).toEqual(undefined);

    metadataDB.put("foo", -3.999);
    expect(metadataDB.get("foo")).toEqual(-3.999);
    expect(metadataDB.get(number, "foo")).toEqual(-3.999);
    expect(metadataDB.get(integer, "foo")).toEqual(undefined);
    expect(metadataDB.get(rounded, "foo")).toEqual(-4);
    expect(metadataDB.get(string, "foo")).toEqual(undefined);
  });

  test("two namespaces of the same type don't conflict", () => {
    const driver = makeNewInMemoryDriver();
    const metadataDB = makeMetadataDB(driver);

    metadataDB.put("foo", null);
    metadataDB.put("foo", 123);
    metadataDB.put("foo", "bar");
    metadataDB.put("bar", [42, 1337]);

    const node1 = {
      type: CrdtType.OBJECT,
      data: { haha: "cool" },
      parentId: "root",
      parentKey: "a",
    };
    const node2 = {
      type: CrdtType.OBJECT,
      data: {},
      parentId: "root",
      parentKey: "b",
    };
    driver.set_child("foo", node1);
    driver.set_child("bar", node2);

    // Namespaces don't conflict
    expect(metadataDB.get("foo")).toEqual("bar");
    expect(metadataDB.get("bar")).toEqual([42, 1337]);
    // Both raw_iter_nodes and iter_nodes include root
    expect(new Map(driver.raw_iter_nodes())).toEqual(
      new Map<string, SerializedCrdt>([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        ["foo", node1],
        ["bar", node2],
      ])
    );
    expect(new Map<string, SerializedCrdt>(driver.iter_nodes())).toEqual(
      new Map<string, SerializedCrdt>([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        ["foo", node1],
        ["bar", node2],
      ])
    );

    // Deleting foo from metadata namespace has no effect on other namespaces
    metadataDB.delete("foo");
    expect(metadataDB.get("foo")).toEqual(undefined);
    expect(new Map(driver.raw_iter_nodes()).get("foo")).toEqual(node1);
    expect(
      new Map<string, SerializedCrdt>(driver.iter_nodes()).get("foo")
    ).toEqual(node1);
  });
});
