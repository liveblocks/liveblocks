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

import { parseArgs as builtinParseArgs } from "node:util";

import { red } from "~/lib/term-colors";

// Maps an Options field to the required option config shape. If the field is
// required (has a default), the config must include `default`. If the field is
// optional (no default), `default` is optional in the config.
type OptionDef<V, Optional extends boolean> = Optional extends true
  ? V extends string
    ? { type: "string"; short?: string; default?: string }
    : V extends boolean
      ? { type: "boolean"; short?: string; default?: boolean }
      : never
  : V extends string
    ? { type: "string"; short?: string; default: string }
    : V extends boolean
      ? { type: "boolean"; short?: string; default: boolean }
      : never;

type OptionDefs<T> = {
  [K in keyof T]-?: OptionDef<
    NonNullable<T[K]>,
    // eslint-disable-next-line @typescript-eslint/ban-types -- intentional
    {} extends Pick<T, K> ? true : false
  >;
};

/**
 * Lightweight wrapper around node:util parseArgs.
 * Strict by default (errors on unrecognized flags), with clean error output.
 *
 * The Options type parameter ties the option definitions to the result type:
 * required fields in Options must have a `default` in the config, optional
 * fields may omit it.
 */
export function parseArgs<T>(
  argv: string[],
  optionDefs: OptionDefs<T>,
  config?: { allowPositionals?: boolean }
): { options: T; args: string[] } {
  try {
    const { values, positionals } = builtinParseArgs({
      args: argv,
      options: optionDefs as Record<
        string,
        {
          type: "string" | "boolean";
          short?: string;
          default?: string | boolean;
        }
      >,
      strict: true,
      allowPositionals: config?.allowPositionals ?? false,
    });
    return { options: values as T, args: positionals };
  } catch (err) {
    console.error(red(String(err instanceof Error ? err.message : err)));
    process.exit(1);
  }
}
