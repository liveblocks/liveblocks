import clsx from "clsx";
import { ComponentProps, useEffect, useState } from "react";
import { updateGeneralAccess } from "@/lib/actions";
import { Select } from "@/primitives/Select";
import {
  Document,
  DocumentPermissionGroup,
  DocumentPermissionType,
  DocumentPermissions,
} from "@/types";
import styles from "./ShareDialogGeneral.module.css";

interface Props extends ComponentProps<"div"> {
  generalPermissions: DocumentPermissions;
  documentId: Document["id"];
  fullAccess: boolean;
  onSetDefaultAccess: () => void;
}

// TODO tidy up this, add spinner, remember why fullAccess was passed

export function ShareDialogGeneral({
  documentId,
  fullAccess,
  generalPermissions,
  onSetDefaultAccess,
  className,
  ...props
}: Props) {
  const [permissionsGroup, setPermissionsGroup] =
    useState<DocumentPermissionGroup>(generalPermissions.group);
  const [permissionType, setPermissionType] = useState<DocumentPermissionType>(
    generalPermissions.type
  );
  const [isLoading, setIsLoading] = useState(false);

  // When default access changed by another connected user, update UI
  useEffect(() => {
    setPermissionsGroup(generalPermissions.group);
    setPermissionType(generalPermissions.type);
  }, [generalPermissions]);

  // Handle permission change
  async function handlePermissionChange({
    group,
    type,
  }: {
    group: DocumentPermissionGroup;
    type: DocumentPermissionType;
  }) {
    setIsLoading(true);
    setPermissionsGroup(group);
    setPermissionType(type);

    const { data, error } = await updateGeneralAccess({
      documentId: documentId,
      permissionGroup: group,
      permissionType: type,
    });

    if (error || !data) {
      // Revert on error
      setPermissionsGroup(generalPermissions.group);
      setPermissionType(generalPermissions.type);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onSetDefaultAccess();
  }

  return (
    <>
      <div className={clsx(className, styles.default)} {...props}>
        <div className={styles.section}>
          <div className={styles.sectionStart}>
            <div className={styles.sectionIcon}></div>
            <div>
              <Select
                disabled={isLoading}
                inlineDescription
                variant="subtle"
                aboveOverlay
                value={permissionsGroup}
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
                onChange={(value: DocumentPermissionGroup) => {
                  // When changing the group, always set to "read" first
                  handlePermissionChange({
                    group: value,
                    type: "read",
                  });
                }}
              />
            </div>
          </div>
          <div className={styles.sectionAction}>
            {permissionsGroup !== "private" ? (
              <Select
                disabled={isLoading}
                aboveOverlay
                initialValue={permissionType}
                items={[
                  {
                    title: "Can edit",
                    value: "write",
                    description: "User can read, edit, and share the document",
                  },
                  {
                    title: "Can read",
                    value: "read",
                    description: "User can only read the document",
                  },
                ]}
                onChange={(value: DocumentPermissionType) => {
                  // Updates the current group's permission type
                  handlePermissionChange({
                    group: permissionsGroup,
                    type: value,
                  });
                }}
                value={permissionType}
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
