import * as Y from "yjs";

/**
 * Per-document version metadata stored in a `Y.Array` named "versions". The
 * array order is the canonical chronological order of versions. The last
 * entry is considered the current (editable) version.
 *
 * The actual markdown text for a version `id` lives in a top-level Y.Text
 * named `text:<id>` — i.e. `yDoc.getText(textKeyForVersion(version.id))`.
 */
export type VersionInfo = {
  id: string;
  createdAt: number;
  label?: string;
};

export const VERSIONS_ARRAY_KEY = "versions";

export function textKeyForVersion(versionId: string): string {
  return `text:${versionId}`;
}

export function getVersionsArray(doc: Y.Doc): Y.Array<VersionInfo> {
  return doc.getArray<VersionInfo>(VERSIONS_ARRAY_KEY);
}

export function getVersionText(doc: Y.Doc, versionId: string): Y.Text {
  return doc.getText(textKeyForVersion(versionId));
}

export function readVersions(doc: Y.Doc): VersionInfo[] {
  return getVersionsArray(doc).toArray();
}

function createVersionId(): string {
  // Compact, URL-safe id (no nanoid in a non-RSC client bundle would also work,
  // but using a small custom generator keeps this file dependency-free).
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Bootstraps the very first version on an empty document. Safe to call
 * repeatedly — only takes effect if no versions exist yet.
 *
 * Returns the id of the (first) version.
 */
export function ensureInitialVersion(doc: Y.Doc, initialText = ""): string {
  const versions = getVersionsArray(doc);
  if (versions.length > 0) {
    return versions.get(0).id;
  }

  const id = createVersionId();
  doc.transact(() => {
    versions.push([{ id, createdAt: Date.now() }]);
    if (initialText.length > 0) {
      getVersionText(doc, id).insert(0, initialText);
    }
  }, "ensureInitialVersion");
  return id;
}

/**
 * Snapshot the current (last) version into a new version. Copies the text and
 * appends a new entry to the versions array. Returns the new version id.
 *
 * The new version becomes the current (editable) version.
 */
export function snapshotCurrentVersion(doc: Y.Doc, label?: string): string {
  const versions = getVersionsArray(doc);
  if (versions.length === 0) {
    return ensureInitialVersion(doc);
  }

  const newId = createVersionId();
  const previous = versions.get(versions.length - 1);
  const previousText = getVersionText(doc, previous.id).toString();

  doc.transact(() => {
    const newText = getVersionText(doc, newId);
    if (previousText.length > 0) {
      newText.insert(0, previousText);
    }
    versions.push([{ id: newId, createdAt: Date.now(), label }]);
  }, "snapshotCurrentVersion");

  return newId;
}

/**
 * Append a brand new version whose content is a copy of the version at
 * `sourceIndex`. Useful for "duplicate this old version into a new one".
 */
export function duplicateVersion(doc: Y.Doc, sourceIndex: number): string {
  const versions = getVersionsArray(doc);
  if (sourceIndex < 0 || sourceIndex >= versions.length) {
    throw new Error("Source version not found");
  }

  const source = versions.get(sourceIndex);
  const sourceText = getVersionText(doc, source.id).toString();
  const newId = createVersionId();

  doc.transact(() => {
    const newText = getVersionText(doc, newId);
    if (sourceText.length > 0) {
      newText.insert(0, sourceText);
    }
    versions.push([
      {
        id: newId,
        createdAt: Date.now(),
        label: source.label ? `${source.label} (copy)` : undefined,
      },
    ]);
  }, "duplicateVersion");

  return newId;
}

export function renameVersion(
  doc: Y.Doc,
  versionId: string,
  label: string
): void {
  const versions = getVersionsArray(doc);
  doc.transact(() => {
    for (let i = 0; i < versions.length; i++) {
      const v = versions.get(i);
      if (v.id === versionId) {
        versions.delete(i, 1);
        versions.insert(i, [{ ...v, label }]);
        return;
      }
    }
  }, "renameVersion");
}
