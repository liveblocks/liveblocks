import * as Y from "yjs";
import styles from "./SidePanel.module.css";

type Props = {
  yUndoManager: Y.UndoManager;
  currentFile: string;
  files: [string, Y.Text][];
  onFileChange: (fileName: string) => void;
};

export function SidePanel({ files, onFileChange }: Props) {
  return (
    <div className={styles.toolbar}>
      {files.map(([name]) => (
        <div key={name} onClick={() => onFileChange(name)}>
          {name}
        </div>
      ))}
    </div>
  );
}
