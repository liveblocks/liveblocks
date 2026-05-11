"use client";

import { useSelf } from "@liveblocks/react/suspense";
import { Composer, Thread } from "@liveblocks/react-ui";
import { useCellThread } from "./CellThreadContext";
import styles from "./SpreadsheetComments.module.css";

export function SpreadsheetComments() {
  const { threads } = useCellThread();
  const selectedCell = useSelf((me) => me.presence.selectedCell);

  const cellLabel = selectedCell
    ? `${columnLetters(selectedCell.col)}${selectedCell.row + 1}`
    : null;

  const rowId = selectedCell ? String(selectedCell.row) : null;
  const columnId = selectedCell ? String(selectedCell.col) : null;

  const cellThread =
    rowId && columnId
      ? threads.find(
          ({ metadata }) =>
            metadata.rowId === rowId && metadata.columnId === columnId
        )
      : null;

  const cellThreads = threads.filter(
    ({ metadata }) =>
      metadata.rowId !== undefined && metadata.columnId !== undefined
  );

  return (
    <div className={styles.comments}>
      <div className={styles.header}>
        <h2 className={styles.title}>Comments</h2>
        {cellLabel ? (
          <span className={styles.cellLabel}>Cell {cellLabel}</span>
        ) : null}
      </div>

      <div className={styles.content}>
        {selectedCell && rowId && columnId ? (
          <div className={styles.section}>
            {cellThread ? (
              <Thread thread={cellThread} className={styles.thread} />
            ) : (
              <div className={styles.composer}>
                <Composer
                  metadata={{ rowId, columnId }}
                  className={styles.composerInput}
                  overrides={{
                    COMPOSER_PLACEHOLDER: `Comment on cell ${cellLabel}\u2026`,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <p className={styles.placeholder}>Select a cell to add a comment</p>
        )}

        {cellThreads.length > 0 ? (
          <div className={styles.section}>
            <h3 className={styles.subtitle}>All comments</h3>
            {cellThreads.map((thread) => (
              <Thread
                key={thread.id}
                thread={thread}
                className={styles.thread}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function columnLetters(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}
