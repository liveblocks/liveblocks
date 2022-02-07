import React from "react";
import UndoButton from "./UndoButton";
import RedoButton from "./RedoButton";
import styles from "./index.module.css";

export default function ToolsBar() {
  return (
    <div className={styles.tools_panel_container}>
      <div className={styles.tools_panel}>
        <div className={styles.tools_panel_section}>
          <UndoButton />
          <RedoButton />
        </div>
      </div>
    </div>
  );
}
