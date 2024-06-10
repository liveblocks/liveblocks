import { useSelf } from "@liveblocks/react/suspense";
import clsx from "clsx";
import {
  ChangeEvent,
  ComponentProps,
  KeyboardEvent,
  useCallback,
  useState,
} from "react";
import { EditIcon } from "@/icons";
import { useInitialDocument } from "@/lib/hooks/useInitialDocument";
import { Tooltip } from "@/primitives/Tooltip";
import styles from "./DocumentHeaderName.module.css";

interface Props extends ComponentProps<"div"> {
  onDocumentRename: (name: string) => void;
}

export function DocumentHeaderName({
  onDocumentRename,
  className,
  ...props
}: Props) {
  const initialDocument = useInitialDocument();
  const isReadOnly = useSelf((me) => !me.canWrite);
  const [draftName, setDraftName] = useState(initialDocument.name);
  const [isRenaming, setRenaming] = useState(false);

  const handleRenamingStart = useCallback(() => {
    setRenaming(true);
  }, []);

  const handleRenamingCancel = useCallback(() => {
    setDraftName(initialDocument.name);
    setRenaming(false);
  }, [initialDocument]);

  const handleRenamingSave = useCallback(() => {
    onDocumentRename(draftName);
    setRenaming(false);
  }, [draftName, onDocumentRename]);

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraftName(event.target.value);
    },
    []
  );

  const handleNameKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        handleRenamingSave();
      } else if (event.key === "Escape") {
        handleRenamingCancel();
      }
    },
    [handleRenamingCancel, handleRenamingSave]
  );

  return (
    <div className={clsx(className, styles.container)} {...props}>
      {isReadOnly ? (
        <>
          <span className={styles.name}>{draftName}</span>
          <span className={styles.badge}>Read-only</span>
        </>
      ) : isRenaming ? (
        <input
          autoFocus
          className={styles.nameInput}
          onBlur={handleRenamingCancel}
          onChange={handleNameChange}
          onKeyDown={handleNameKeyDown}
          value={draftName}
        />
      ) : (
        <>
          <span className={styles.name}>{draftName}</span>
          <Tooltip content="Rename" sideOffset={30}>
            <button
              className={styles.renameButton}
              onClick={handleRenamingStart}
            >
              <EditIcon />
            </button>
          </Tooltip>
        </>
      )}
    </div>
  );
}
