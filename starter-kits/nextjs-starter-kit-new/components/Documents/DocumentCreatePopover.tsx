import { ComponentProps } from "react";
import { PlusIcon } from "@/icons";
import { createDocument } from "@/libnew/createDocument";
import { Button } from "@/primitives/Button";
import { Popover } from "@/primitives/Popover";
import { Document, DocumentGroup, DocumentType, DocumentUser } from "@/types";
import styles from "./DocumentCreatePopover.module.css";

interface Props extends Omit<ComponentProps<typeof Popover>, "content"> {
  documentName?: Document["name"];
  draft: Document["draft"];
  groupIds?: DocumentGroup["id"][];
  userId: DocumentUser["id"];
}

export function DocumentCreatePopover({
  groupIds,
  userId,
  draft,
  children,
  ...props
}: Props) {
  // Create a new document, then navigate to the document's URL location
  async function createNewDocument(name: string, type: DocumentType) {
    const { data, error } = await createDocument(
      {
        name,
        type,
        userId,
        draft,
        groupIds: draft ? undefined : groupIds,
      },
      true
    );

    if (error || !data) {
      return;
    }
  }

  return (
    <Popover
      content={
        <div className={styles.popover}>
          <Button
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument("Untitled", "text");
            }}
            variant="subtle"
          >
            Text
          </Button>
          <Button
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument("Untitled", "whiteboard");
            }}
            variant="subtle"
          >
            Whiteboard
          </Button>
          <Button
            disabled
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument("Untitled", "spreadsheet");
            }}
            variant="subtle"
          >
            Spreadsheet
          </Button>
        </div>
      }
      modal
      side="bottom"
      {...props}
    >
      {children}
    </Popover>
  );
}
