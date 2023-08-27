import * as Y from "yjs";
import { DeleteIcon, FileIcon } from "../../icons";
import { SidePanelAvatars } from "./SidePanelOthers";
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
  return (
    <div className={styles.sidePanel}>
      {files.map(([name]) => (
        <div
          key={name}
          data-active={name === currentFile || undefined}
          className={styles.sidePanelFile}
        >
          <div className={styles.sidePanelFileName}>
            <FileIcon opacity={0.2} />
            <button onClick={() => onFileChange(name)}>
              <span>{name}</span>
            </button>
            <button
              className={styles.sidePanelFileDelete}
              onClick={() => onDeleteFile(name)}
              aria-label="Delete file"
            >
              <DeleteIcon />
            </button>
          </div>
          <div>
            <SidePanelAvatars fileName={name} />
          </div>
        </div>
      ))}
      <button onClick={() => onCreateFile("")}>New file</button>
    </div>
  );
}
