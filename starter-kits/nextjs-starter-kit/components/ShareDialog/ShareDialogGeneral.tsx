import clsx from "clsx";
import Image from "next/image";
import { ComponentProps, useEffect, useState } from "react";
import { EarthIcon, LockIcon } from "@/icons";
import { getOrganizations, updateGeneralAccess } from "@/lib/actions";
import { useDocumentsFunctionSWR } from "@/lib/hooks";
import { Select } from "@/primitives/Select";
import {
  Document,
  DocumentPermissionGroup,
  DocumentPermissionType,
} from "@/types";
import styles from "./ShareDialogGeneral.module.css";

interface Props extends ComponentProps<"div"> {
  document: Document;
  fullAccess: boolean;
  onSetDefaultAccess: () => void;
}

// TODO tidy up this, add spinner, remember why fullAccess was passed

export function ShareDialogGeneral({
  document,
  fullAccess,
  onSetDefaultAccess,
  className,
  ...props
}: Props) {
  const [permissionsGroup, setPermissionsGroup] =
    useState<DocumentPermissionGroup>(document.generalPermissions.group);
  const [permissionType, setPermissionType] = useState<DocumentPermissionType>(
    document.generalPermissions.type
  );
  const [isLoading, setIsLoading] = useState(false);

  // When default access changed by another connected user, update UI
  useEffect(() => {
    setPermissionsGroup(document.generalPermissions.group);
    setPermissionType(document.generalPermissions.type);
  }, [document]);

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
      documentId: document.id,
      permissionGroup: group,
      permissionType: type,
    });

    if (error || !data) {
      // Revert on error
      setPermissionsGroup(document.generalPermissions.group);
      setPermissionType(document.generalPermissions.type);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onSetDefaultAccess();
  }

  // Get the organization this document belongs to
  const { data: organizations, isLoading: isLoadingOrganizations } =
    useDocumentsFunctionSWR(
      [getOrganizations, { organizationIds: [document.organization] }],
      {
        refreshInterval: 0,
      }
    );
  const documentOrganization = organizations?.[0] ?? null;

  return (
    <>
      <div className={clsx(className, styles.default)} {...props}>
        <div className={styles.section}>
          <div className={styles.sectionStart}>
            <div className={styles.sectionIcon}>
              {permissionsGroup === "private" ? <LockIcon /> : null}

              {permissionsGroup === "organization" ? (
                !isLoadingOrganizations && documentOrganization ? (
                  <Image
                    src={documentOrganization?.avatar ?? ""}
                    alt={documentOrganization?.name ?? ""}
                    width={24}
                    height={24}
                  />
                ) : null
              ) : null}

              {permissionsGroup === "public" ? <EarthIcon /> : null}
            </div>
            <div>
              <Select
                disabled={isLoading}
                style={{ pointerEvents: fullAccess ? undefined : "none" }}
                inlineDescription
                variant="subtle"
                aboveOverlay
                value={permissionsGroup}
                items={[
                  {
                    title: "Private",
                    value: "private",
                    description: "Only you have access",
                  },
                  {
                    title: isLoadingOrganizations
                      ? "Loading…"
                      : (documentOrganization?.name ?? "Undefined"),
                    value: "organization",
                    description: `Only organization members have access`,
                  },
                  {
                    title: "Anyone with a link",
                    value: "public",
                    description: `Anyone on the internet can access`,
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
                style={{ pointerEvents: fullAccess ? undefined : "none" }}
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
