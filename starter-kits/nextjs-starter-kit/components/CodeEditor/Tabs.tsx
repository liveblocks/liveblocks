import * as Y from "yjs";
import styles from "./Tabs.module.css";

type Props = {
  yUndoManager: Y.UndoManager;
  currentFile: string;
  files: [string, Y.Text][];
  onFileChange: (fileName: string) => void;
};

export function Tabs({ currentFile, files, onFileChange }: Props) {
  console.log(currentFile);
  return (
    <div className={styles.tabs}>
      {files.map(([name]) => (
        <button
          key={name}
          className={styles.tab}
          data-active={name === currentFile || undefined}
          onClick={() => onFileChange(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
