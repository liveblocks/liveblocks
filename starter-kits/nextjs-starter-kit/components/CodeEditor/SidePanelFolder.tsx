import { useState } from "react";
import { FolderSmallIcon } from "../../icons/FolderSmall";
import { SidePanelNode } from "./SidePanelNode";
import { FolderNode } from "./utils";
import styles from "./SidePanelFiles.module.css";

type Props = {
  name: string;
  node: FolderNode;
  onFileChange: (filePath: string) => void;
  onDeleteFile: (filePath: string) => void;
  path: string;
  currentPath: string;
};

export function SidePanelFolder({
  name,
  node,
  onFileChange,
  onDeleteFile,
  path,
  currentPath,
}: Props) {
  const fullPath = path ? `${path}/${name}` : name;
  const [open, setOpen] = useState(true);

  return (
    <li className={styles.sidePanelFolder} onClick={() => setOpen(!open)}>
      <div className={styles.sidePanelFolderSummary}>
        <span className={styles.sidePanelFolderName}>
          <FolderSmallIcon opacity="0.3" />
          {name}
        </span>
      </div>
      <div style={{ display: open ? "block" : "none" }}>
        <SidePanelNode
          fileTree={node.children}
          onFileChange={onFileChange}
          onDeleteFile={onDeleteFile}
          path={fullPath}
          currentPath={currentPath}
        />
      </div>
    </li>
  );
}
