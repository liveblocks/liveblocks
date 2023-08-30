import { useMemo } from "react";
import * as Y from "yjs";
import { SidePanelNode } from "./SidePanelNode";
import { convertFilesToFileTree } from "./utils";
import styles from "./SidePanel.module.css";

type Props = {
  yUndoManager: Y.UndoManager;
  currentFile: string;
  files: [string, Y.Text][];
  onFileChange: (fileName: string) => void;
  onCreateFile: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
};

export function SidePanel({
  currentFile,
  files,
  onFileChange,
  onCreateFile,
  onDeleteFile,
}: Props) {
  const fileTree = useMemo(() => convertFilesToFileTree(files), [files]);

  return (
    <div className={styles.sidePanel}>
      <SidePanelNode
        path=""
        fileTree={fileTree}
        onFileChange={onFileChange}
        onDeleteFile={onDeleteFile}
        currentPath={currentFile}
      />

      <button onClick={() => onCreateFile("src/hello/world.ts")}>
        New file
      </button>
    </div>
  );
}
