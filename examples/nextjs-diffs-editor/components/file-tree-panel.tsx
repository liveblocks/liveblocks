"use client";

import { FileTree, useFileTree } from "@pierre/trees/react";
import { useRef } from "react";

type FileTreePanelProps = {
  /** All file paths in the shared project. */
  paths: string[];
  activePath: string;
  onSelectFile: (path: string) => void;
};

/** VS Code-like sidebar listing the shared project's files. */
export function FileTreePanel({
  paths,
  activePath,
  onSelectFile,
}: FileTreePanelProps) {
  // The tree model is created once, on first render; route the changing
  // values through refs so the creation-time callback stays current.
  const onSelectFileRef = useRef(onSelectFile);
  onSelectFileRef.current = onSelectFile;
  const filePathsRef = useRef(new Set(paths));
  filePathsRef.current = new Set(paths);

  const { model } = useFileTree({
    paths,
    initialExpansion: "open",
    initialSelectedPaths: [activePath],
    onSelectionChange: (selectedPaths) => {
      const path = selectedPaths[0];
      // Directories can be selected too; only react to files.
      if (path !== undefined && filePathsRef.current.has(path)) {
        onSelectFileRef.current(path);
      }
    },
  });

  return <FileTree model={model} className="block h-full" />;
}
