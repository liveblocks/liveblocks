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

const enabled = process.stdout.isTTY;
const RESET = "\x1b[0m";

export function yellow(text: string): string {
  return enabled ? `\x1b[33m${text}${RESET}` : text;
}

export function blue(text: string): string {
  return enabled ? `\x1b[34m${text}${RESET}` : text;
}

export function magenta(text: string): string {
  return enabled ? `\x1b[35m${text}${RESET}` : text;
}

export function green(text: string): string {
  return enabled ? `\x1b[32m${text}${RESET}` : text;
}

export function red(text: string): string {
  return enabled ? `\x1b[31m${text}${RESET}` : text;
}

export function bold(text: string): string {
  return enabled ? `\x1b[1m${text}${RESET}` : text;
}

export function dim(text: string): string {
  return enabled ? `\x1b[2m${text}${RESET}` : text;
}
