import * as Y from "yjs";
import { Tooltip } from "../../primitives/Tooltip";
import styles from "./Tabs.module.css";

type Props = {
  yUndoManager: Y.UndoManager;
  currentFile: string;
  files: [string, Y.Text][];
  onFileChange: (fileName: string) => void;
};

export function Tabs({ currentFile, files, onFileChange }: Props) {
  return (
    <div className={styles.tabs}>
      {files.map(([name]) => (
        <Tooltip content={name} key={name}>
          <button
            className={styles.tab}
            data-active={name === currentFile || undefined}
            onClick={() => onFileChange(name)}
          >
            {name.split("/").slice(-1)}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
