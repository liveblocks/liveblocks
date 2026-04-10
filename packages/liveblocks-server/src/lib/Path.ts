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
 * Think of a "Path" as a breadcrumb-style path, i.e.
 *
 *    root.foo.bar[].qux
 *
 * This is used to indicate the location of an error when we throw it, so the
 * user can better understand where the error is happening.
 *
 * Technically, a Path is a reversed linked list (where there is a "previous"
 * point, instead of a "next" pointer), used for efficient appending of paths
 * during traversal when performing the schema assignment/distribution. This is
 * faster than doing `[...path, key]` style appending, because no elements have
 * to be copied.
 */
export type Path = RevLinkedList<string>;

type RevLinkedList<T> = {
  readonly value: T;
  readonly parent?: RevLinkedList<T>;
};

export const ROOT_PATH: Path = { value: "root" } as const;

export function appendPath(parent: Path, value: string): Path {
  return { value, parent };
}

/**
 * Formats a path into the storage, for displaying error locations.
 */
export function formatPath(path: Path, suffix = ""): string {
  if (!path.parent) {
    return path.value + suffix;
  }

  if (path.value === "[]") {
    suffix = "[]" + suffix;
  } else {
    suffix = "." + path.value + suffix;
  }
  return formatPath(path.parent, suffix);
}
