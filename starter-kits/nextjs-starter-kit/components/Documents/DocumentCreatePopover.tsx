import { useRouter } from "next/router";
import { ComponentProps } from "react";
import { DOCUMENT_URL } from "../../constants";
import { PlusIcon } from "../../icons";
import { createDocument } from "../../lib/client";
import { Button } from "../../primitives/Button";
import { Popover } from "../../primitives/Popover";
import {
  Document,
  DocumentGroup,
  DocumentType,
  DocumentUser,
} from "../../types";
import styles from "./DocumentCreatePopover.module.css";

interface Props extends Omit<ComponentProps<typeof Popover>, "content"> {
  documentName?: Document["name"];
  draft: Document["draft"];
  groupIds?: DocumentGroup["id"][];
  userId: DocumentUser["id"];
}

export function DocumentCreatePopover({
  documentName = "Untitled",
  groupIds,
  userId,
  draft,
  children,
  ...props
}: Props) {
  const router = useRouter();

  // Create a new document, then navigate to the document's URL location
  async function createNewDocument(name: string, type: DocumentType) {
    const { data, error } = await createDocument({
      name: documentName,
      type: type,
      userId: userId,
      draft: draft,
      groupIds: draft ? undefined : groupIds,
    });

    if (error || !data) {
      return;
    }

    const newDocument: Document = data;
    router.push(DOCUMENT_URL(newDocument.type, newDocument.id));
  }

  return (
    <Popover
      content={
        <div className={styles.popover}>
          <Button
            disabled
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument(documentName, "text");
            }}
            variant="subtle"
          >
            Text
          </Button>
          <Button
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument(documentName, "whiteboard");
            }}
            variant="subtle"
          >
            Whiteboard
          </Button>
          <Button
            disabled
            icon={<PlusIcon />}
            onClick={() => {
              createNewDocument(documentName, "spreadsheet");
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
