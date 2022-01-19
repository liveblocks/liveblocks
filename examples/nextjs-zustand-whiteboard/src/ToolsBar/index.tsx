import React from "react";
import UndoButton from "./UndoButton";
import RedoButton from "./RedoButton";
import styles from "./index.module.css";
import useStore from "../store";

export default function ToolsBar() {
  const history = useStore((state) => state.history);

  return (
    <div className={styles.tools_panel_container}>
      <div className={styles.tools_panel}>
        <div className={styles.tools_panel_section}>
          <UndoButton onClick={history.undo} />
          <RedoButton onClick={history.redo} />
        </div>
      </div>
    </div>
  );
}
