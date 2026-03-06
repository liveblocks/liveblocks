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

import { styleText } from "node:util";

type Stringable = { toString(): string };

// Node's styleText auto-strips ANSI when not a TTY, but Bun's doesn't,
// even with { stream, validateStream: true } (broken as of Bun 1.3.8)
const enabled = process.stdout.isTTY;

export function yellow(text: Stringable): string {
  return enabled ? styleText("yellow", String(text)) : String(text);
}

export function blue(text: Stringable): string {
  return enabled ? styleText("blue", String(text)) : String(text);
}

export function magenta(text: Stringable): string {
  return enabled ? styleText("magenta", String(text)) : String(text);
}

export function green(text: Stringable): string {
  return enabled ? styleText("green", String(text)) : String(text);
}

export function red(text: Stringable): string {
  return enabled ? styleText("red", String(text)) : String(text);
}

export function bold(text: Stringable): string {
  return enabled ? styleText("bold", String(text)) : String(text);
}

export function dim(text: Stringable): string {
  return enabled ? styleText("dim", String(text)) : String(text);
}
