import clsx from "clsx";
import { ComponentProps, useEffect, useState } from "react";
import { updateDefaultAccess } from "@/lib/actions";
import { Select } from "@/primitives/Select";
import { Document, DocumentAccess } from "@/types";
import styles from "./ShareDialogDefault.module.css";

interface Props extends ComponentProps<"div"> {
  defaultAccess: DocumentAccess;
  documentId: Document["id"];
  fullAccess: boolean;
  onSetDefaultAccess: () => void;
}

export function ShareDialogDefault({
  documentId,
  fullAccess,
  defaultAccess,
  onSetDefaultAccess,
  className,
  ...props
}: Props) {
  const [publicRead, setPublicRead] = useState(false);
  const [isPublicReadLoading, setPublicReadLoading] = useState(false);
  const [publicEdit, setPublicEdit] = useState(false);
  const [isPublicEditLoading, setPublicEditLoading] = useState(false);

  // Toggle between public accesses: READONLY/NONE
  async function handlePublicRead(newPublicRead: boolean) {
    setPublicReadLoading(true);

    const accessValue = newPublicRead
      ? DocumentAccess.READONLY
      : DocumentAccess.NONE;

    const { data, error } = await updateDefaultAccess({
      documentId: documentId,
      access: accessValue,
    });

    if (error || !data) {
      return;
    }

    setPublicRead(newPublicRead);
    setPublicReadLoading(false);
    onSetDefaultAccess();
  }

  // Toggle between public accesses: EDIT/READONLY
  async function handlePublicEdit(newPublicEdit: boolean) {
    setPublicEditLoading(true);

    const accessValue = newPublicEdit
      ? DocumentAccess.EDIT
      : DocumentAccess.READONLY;

    const { data, error } = await updateDefaultAccess({
      documentId: documentId,
      access: accessValue,
    });

    if (error || !data) {
      return;
    }

    setPublicEdit(newPublicEdit);
    setPublicEditLoading(false);
    onSetDefaultAccess();
  }

  // When default access change by another, update UI
  useEffect(() => {
    setPublicRead(defaultAccess !== DocumentAccess.NONE);
    setPublicEdit(defaultAccess === DocumentAccess.EDIT);
  }, [defaultAccess]);

  const [generalAccess, setGeneralAccess] = useState("private");

  return (
    <>
      <div className={clsx(className, styles.default)} {...props}>
        <div className={styles.section}>
          <div className={styles.sectionStart}>
            <div className={styles.sectionIcon}></div>
            <div>
              <Select
                inlineDescription
                variant="subtle"
                aboveOverlay
                value={generalAccess}
                items={[
                  {
                    title: "Private",
                    value: "private",
                    description: "Only you can open and edit",
                  },
                  {
                    title: "Liveblocks",
                    value: "organization",
                    description: "Only members can view/edit",
                  },
                  {
                    title: "Anyone with link",
                    value: "public",
                    description: "Anyone on the internet can view/edit",
                  },
                ]}
                onChange={(value) => {
                  setGeneralAccess(value);
                  // handleDefaultAccessChange(value as DocumentAccess);
                }}
              />
              {/* <div className={styles.sectionDescription}>
                {generalAccess === "organization"
                  ? "Anyone in this group can view/edit"
                  : generalAccess === "public"
                    ? "Anyone on the internet can view/edit"
                    : "Only you can open and edit"}
              </div> */}
            </div>
          </div>
          <div className={styles.sectionAction}>
            {generalAccess !== "private" ? (
              <Select
                aboveOverlay
                initialValue={DocumentAccess.READONLY}
                items={[
                  {
                    title: "Can edit",
                    value: DocumentAccess.FULL,
                    description: "User can read, edit, and share the document",
                  },
                  {
                    title: "Can read",
                    value: DocumentAccess.READONLY,
                    description: "User can only read the document",
                  },
                ]}
                onChange={(value) => {
                  // handleDefaultAccessChange(value as DocumentAccess);
                }}
                value={defaultAccess}
              />
            ) : null}
          </div>
        </div>

        {/*
      <div className={styles.section}>
        <label
          className={styles.sectionLabel}
          data-disabled={fullAccess ? undefined : true}
          htmlFor="public-read-checkbox"
        >
          <LinkIcon className={styles.sectionLabelIcon} />
          <span>Enable public share link</span>
        </label>
        <div className={styles.sectionAction}>
          {isPublicReadLoading ? (
            <Spinner size={18} />
          ) : (
            <Checkbox
              checked={publicRead}
              disabled={!fullAccess}
              id="public-read-checkbox"
              initialValue={defaultAccess !== DocumentAccess.NONE}
              name="public-read-checkbox"
              onValueChange={handlePublicRead}
            />
          )}
        </div>
      </div>

      {defaultAccess !== DocumentAccess.NONE ? (
        <>
          <div className={styles.section}>
            <label
              className={styles.sectionLabel}
              data-disabled={fullAccess ? undefined : true}
              htmlFor="public-edit-checkbox"
            >
              <EditIcon className={styles.sectionLabelIcon} />
              <span> Allow anyone to edit</span>
            </label>
            <div className={styles.sectionAction}>
              {isPublicEditLoading ? (
                <Spinner size={18} />
              ) : (
                <Checkbox
                  checked={publicEdit}
                  disabled={!fullAccess || isPublicEditLoading}
                  id="public-edit-checkbox"
                  initialValue={defaultAccess === DocumentAccess.EDIT}
                  name="public-edit-checkbox"
                  onValueChange={handlePublicEdit}
                />
              )}
            </div>
          </div>
        </>
      ) : null}
      */}
      </div>
    </>
  );
}
