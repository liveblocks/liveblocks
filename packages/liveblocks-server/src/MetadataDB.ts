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

import type { Awaitable, Json } from "@liveblocks/core";
import type { Decoder } from "decoders";

import type { IStorageDriver } from "~/interfaces";

export interface MetadataDB {
  // Getter supports optional decoder
  get(key: string): Promise<Json | undefined>;
  get<T>(decoder: Decoder<T>, key: string): Promise<T | undefined>;

  put(key: string, value: Json): Awaitable<void>;
  delete(key: string): Awaitable<void>;
}

/**
 * Returns a thin wrapper around an IStorageDriver to provide MetadataDB
 * functionality, including type-safe reads.
 */
export function makeMetadataDB(driver: IStorageDriver): MetadataDB {
  async function get(key: string): Promise<Json | undefined>;
  async function get<T>(
    decoder: Decoder<T>,
    key: string
  ): Promise<T | undefined>;
  async function get<T>(
    a1: string | Decoder<T>,
    a2?: string
  ): Promise<T | Json | undefined> {
    if (a2 === undefined) {
      return await driver.get_meta(a1 as string);
    } else {
      return (a1 as Decoder<T>).value(await driver.get_meta(a2));
    }
  }

  return {
    get,
    put: driver.put_meta.bind(driver),
    delete: driver.delete_meta.bind(driver),
  };
}
