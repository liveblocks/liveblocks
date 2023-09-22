import { DeleteIcon } from "../../icons";
import { FileSmallIcon } from "../../icons/FileSmall";
import { SidePanelAvatars } from "./SidePanelOthers";
import { FileNode } from "./utils";
import styles from "./SidePanelFiles.module.css";

interface NodeProps {
  name: string;
  node: FileNode;
  onFileChange: (filePath: string) => void;
  onDeleteFile: (filePath: string) => void;
  path: string;
  currentPath: string;
}

export function SidePanelFile(props: NodeProps) {
  const { name, node, onFileChange, onDeleteFile, path, currentPath } = props;
  const fullPath = path ? `${path}/${name}` : name;

  return (
    <li>
      <div
        key={fullPath}
        data-active={fullPath === currentPath || undefined}
        className={styles.sidePanelFile}
      >
        <div className={styles.sidePanelFileName}>
          <FileSmallIcon opacity="0.3" />
          <button onClick={() => onFileChange(fullPath)}>
            <span>{name}</span>
          </button>
          <button
            className={styles.sidePanelFileDelete}
            onClick={() => onDeleteFile(fullPath)}
            aria-label="Delete file"
          >
            <DeleteIcon />
          </button>
        </div>
        <div>
          <SidePanelAvatars fileName={fullPath} />
        </div>
      </div>
    </li>
  );
}
