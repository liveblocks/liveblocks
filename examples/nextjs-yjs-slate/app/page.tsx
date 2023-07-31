import { Room } from "@/app/Room";
import styles from "@/src/Editor.module.css";
import CollaborativeEditor from "@/src/Editor";

export default function Page() {
  return (
    <main>
      <div className={styles.container}>
        <div className={styles.editorContainer}>
          <Room>
            <CollaborativeEditor />
          </Room>
        </div>
      </div>
    </main>
  );
}
