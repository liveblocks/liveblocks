"use client";

import { useOthers } from "@liveblocks/react/suspense";
import type { FileTreeRowDecorationContext } from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

type FileTreePanelProps = {
  /** All file paths in the shared project. */
  paths: string[];
  activePath: string;
  onSelectFile: (path: string) => void;
};

type FileEditor = {
  name: string;
  color: string;
};

type OtherUser = {
  connectionId: number;
  presence: Liveblocks["Presence"];
  info: Liveblocks["UserMeta"]["info"];
};

/** VS Code-like sidebar listing the shared project's files. */
export function FileTreePanel({
  paths,
  activePath,
  onSelectFile,
}: FileTreePanelProps) {
  const others = useOthers();

  // The tree model is created once, on first render; route the changing
  // values through refs so the creation-time callback stays current.
  const onSelectFileRef = useRef(onSelectFile);
  onSelectFileRef.current = onSelectFile;
  const filePathsRef = useRef(new Set(paths));
  filePathsRef.current = new Set(paths);
  const editorsByFileRef = useRef<Map<string, FileEditor[]>>(new Map());
  editorsByFileRef.current = getEditorsByFile(others);

  const renderRowDecoration = useCallback(
    ({ item }: FileTreeRowDecorationContext) => {
      if (item.kind !== "file") {
        return null;
      }

      const editors = editorsByFileRef.current.get(item.path);
      if (editors === undefined || editors.length === 0) {
        return null;
      }

      return {
        text: editors.map(() => "●").join(""),
        parts: editors.flatMap((editor, index) => [
          ...(index > 0 ? [{ text: "\u00a0" as const }] : []),
          { text: "⦁", color: editor.color },
        ]),
        title: editors
          .map((editor) => `${editor.name} is editing this file`)
          .join(", "),
      };
    },
    []
  );

  const { model } = useFileTree({
    paths,
    initialExpansion: "open",
    initialSelectedPaths: [activePath],
    renderRowDecoration,
    onSelectionChange: (selectedPaths) => {
      const path = selectedPaths[0];
      // Directories can be selected too; only react to files.
      if (path !== undefined && filePathsRef.current.has(path)) {
        onSelectFileRef.current(path);
      }
    },
  });

  const presenceKey = useMemo(
    () =>
      others
        .map(
          (other) =>
            `${other.connectionId}:${other.presence.selection?.file ?? ""}`
        )
        .join("|"),
    [others]
  );

  // Re-render row decorations when someone opens a different file.
  useEffect(() => {
    model.setComposition(model.getComposition());
  }, [model, presenceKey]);

  return <FileTree model={model} className="block h-full" />;
}

function getEditorsByFile(
  others: readonly OtherUser[]
): Map<string, FileEditor[]> {
  const editorsByFile = new Map<string, FileEditor[]>();

  for (const other of others) {
    const file = other.presence.selection?.file;
    if (file === undefined || file === null) {
      continue;
    }

    const editors = editorsByFile.get(file) ?? [];
    editors.push({ name: other.info.name, color: other.info.color });
    editorsByFile.set(file, editors);
  }

  return editorsByFile;
}
