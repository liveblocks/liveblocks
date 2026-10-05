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

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FsBlobStore } from "./FsBlobStore";

const DEFAULT_BASE_URL = "http://localhost:1153";

let _store: FsBlobStore | null = null;
let _baseUrl = DEFAULT_BASE_URL;
let _root = ".liveblocks/v3/files";

/**
 * Point the store at a directory. Called by the rooms DB as it initializes, so
 * that blobs follow the same base path as everything else — including into a
 * temp dir in ephemeral mode.
 */
export function setBlobsRoot(root: string): void {
  if (root !== _root) {
    _root = root;
    _store = null;
  }
}

/**
 * Point signed download URLs at the origin the server actually bound to. The
 * dev server calls this once it knows its port; tests can leave the default.
 */
export function setBlobStoreBaseUrl(baseUrl: string): void {
  if (baseUrl !== _baseUrl) {
    _baseUrl = baseUrl;
    _store = null;
  }
}

export function getBlobStore(): FsBlobStore {
  return (_store ??= new FsBlobStore({
    root: _root,
    baseUrl: _baseUrl,
    secret: readOrCreateSecret(_root),
  }));
}

/**
 * Keep the URL-signing secret alongside the blobs, so that links handed out
 * before a restart still work afterwards. Dev-only: a local file, protected by
 * nothing but its permissions.
 */
function readOrCreateSecret(root: string): string {
  mkdirSync(root, { recursive: true });

  const path = join(root, ".signing-secret");
  if (existsSync(path)) {
    return readFileSync(path, "utf8");
  }

  const secret = randomUUID();
  writeFileSync(path, secret, { mode: 0o600 });
  return secret;
}
