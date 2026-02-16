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

import { Logger as LoggerImpl, LogLevel, LogTarget } from "~/lib/Logger";
import { makeMetadataDB } from "~/MetadataDB";
import { makeNewInMemoryDriver } from "~/plugins/InMemoryDriver";

const rounded = number.transform((n) => Math.round(n));

class VoidTarget extends LogTarget {
  constructor() {
    super((LogLevel.ERROR as number) + 1);
  }

  log(): void {
    /* Do nothing */
  }
}

/** A black hole, where logs disappear beyond the event horizon */
const blackHole = new LoggerImpl(new VoidTarget());

describe("test in-memory driver", () => {
  test("basic", async () => {
    const driver = makeNewInMemoryDriver();
    const metadataDB = makeMetadataDB(driver);
    expect(await metadataDB.get("foo")).toEqual(undefined);
    // Before loading, root node should not exist
    expect(new Map(await driver.raw_iter_nodes())).toEqual(new Map());
    // After loading, root node should exist
    const nodesApi = await driver.load_nodes_api(blackHole);
    expect(new Map<string, SerializedCrdt>(nodesApi.iter_nodes())).toEqual(
      new Map([["root", { type: CrdtType.OBJECT, data: {} }]])
    );
  });

  test("put and get are async", async () => {
    const driver = makeNewInMemoryDriver();
    const metadataDB = makeMetadataDB(driver);
    expect(await metadataDB.get("foo")).toEqual(undefined);
    await metadataDB.put("foo", "bar");
    expect(await metadataDB.get("foo")).toEqual("bar");
  });

  test("getters with decoders", async () => {
    const driver = makeNewInMemoryDriver();
    const metadataDB = makeMetadataDB(driver);
    await metadataDB.put("foo", "hi");
    expect(await metadataDB.get("foo")).toEqual("hi");
    expect(await metadataDB.get(number, "foo")).toEqual(undefined);
    expect(await metadataDB.get(rounded, "foo")).toEqual(undefined);
    expect(await metadataDB.get(string, "foo")).toEqual("hi");

    // Override
    await metadataDB.put("foo", 123);
    expect(await metadataDB.get("foo")).toEqual(123);
    expect(await metadataDB.get(number, "foo")).toEqual(123);
    expect(await metadataDB.get(integer, "foo")).toEqual(123);
    expect(await metadataDB.get(rounded, "foo")).toEqual(123);
    expect(await metadataDB.get(string, "foo")).toEqual(undefined);

    await metadataDB.put("foo", 3.999);
    expect(await metadataDB.get("foo")).toEqual(3.999);
    expect(await metadataDB.get(number, "foo")).toEqual(3.999);
    expect(await metadataDB.get(integer, "foo")).toEqual(undefined);
    expect(await metadataDB.get(rounded, "foo")).toEqual(4);
    expect(await metadataDB.get(string, "foo")).toEqual(undefined);

    await metadataDB.put("foo", -3.999);
    expect(await metadataDB.get("foo")).toEqual(-3.999);
    expect(await metadataDB.get(number, "foo")).toEqual(-3.999);
    expect(await metadataDB.get(integer, "foo")).toEqual(undefined);
    expect(await metadataDB.get(rounded, "foo")).toEqual(-4);
    expect(await metadataDB.get(string, "foo")).toEqual(undefined);
  });

  test("two namespaces of the same type don't conflict", async () => {
    const driver = makeNewInMemoryDriver();
    const metadataDB = makeMetadataDB(driver);
    const nodeDriver = await driver.load_nodes_api(blackHole);

    await metadataDB.put("foo", null);
    await metadataDB.put("foo", 123);
    await metadataDB.put("foo", "bar");
    await metadataDB.put("bar", [42, 1337]);

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
    await nodeDriver.set_child("foo", node1);
    await nodeDriver.set_child("bar", node2);

    // Namespaces don't conflict
    expect(await metadataDB.get("foo")).toEqual("bar");
    expect(await metadataDB.get("bar")).toEqual([42, 1337]);
    // Both raw_iter_nodes and iter_nodes include root
    expect(new Map(await driver.raw_iter_nodes())).toEqual(
      new Map<string, SerializedCrdt>([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        ["foo", node1],
        ["bar", node2],
      ])
    );
    expect(new Map<string, SerializedCrdt>(nodeDriver.iter_nodes())).toEqual(
      new Map<string, SerializedCrdt>([
        ["root", { type: CrdtType.OBJECT, data: {} }],
        ["foo", node1],
        ["bar", node2],
      ])
    );

    // Deleting foo from metadata namespace has no effect on other namespaces
    await metadataDB.delete("foo");
    expect(await metadataDB.get("foo")).toEqual(undefined);
    expect(new Map(await driver.raw_iter_nodes()).get("foo")).toEqual(node1);
    expect(
      new Map<string, SerializedCrdt>(
        (await driver.load_nodes_api(blackHole)).iter_nodes()
      ).get("foo")
    ).toEqual(node1);
  });
});
