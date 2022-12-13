import { Document, DocumentAccess, DocumentGroup } from "../../types";
import { ComponentProps } from "react";
import clsx from "clsx";
import { removeGroupAccess, updateGroupAccess } from "../../lib/client";
import { Select } from "../../primitives/Select";
import styles from "./ShareDialogRows.module.css";

interface Props extends ComponentProps<"div"> {
  documentId: Document["id"];
  fullAccess: boolean;
  groups: DocumentGroup[];
  onSetGroups: () => void;
}

export function ShareDialogGroups({
  documentId,
  fullAccess,
  groups,
  onSetGroups,
  className,
  ...props
}: Props) {
  // Remove a group from a room
  async function handleRemoveDocumentGroup(id: DocumentGroup["id"]) {
    const { data, error } = await removeGroupAccess({
      groupId: id,
      documentId: documentId,
    });

    if (error || !data) {
      return;
    }

    onSetGroups();
  }

  // Update a collaborator in the room using email as user id
  async function handleUpdateDocumentGroup(
    id: DocumentGroup["id"],
    access: DocumentAccess
  ) {
    const { data, error } = await updateGroupAccess({
      groupId: id,
      documentId: documentId,
      access: access,
    });

    if (error || !data) {
      return;
    }

    onSetGroups();
  }

  return (
    <div className={clsx(className, styles.rows)} {...props}>
      {groups
        ? groups.map(({ name, id, access }) => (
            <div className={styles.row} key={id}>
              <div className={styles.rowInfo}>
                <span className={styles.rowName}>{name}</span>
                {fullAccess ? (
                  <button
                    className={styles.rowRemoveButton}
                    onClick={() => handleRemoveDocumentGroup(id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className={styles.rowAccessSelect}>
                <Select
                  aboveOverlay
                  disabled={!fullAccess}
                  initialValue={access}
                  items={[
                    {
                      title: "Can edit",
                      value: DocumentAccess.EDIT,
                      description:
                        "Group can read, edit, and share the document",
                    },
                    {
                      title: "Can read",
                      value: DocumentAccess.READONLY,
                      description: "Group can only read the document",
                    },
                  ]}
                  onChange={(value) => {
                    handleUpdateDocumentGroup(id, value as DocumentAccess);
                  }}
                  value={access}
                />
              </div>
            </div>
          ))
        : null}
    </div>
  );
}
