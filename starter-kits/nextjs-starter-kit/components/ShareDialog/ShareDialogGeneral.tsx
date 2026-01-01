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
  onSetGeneralAccess: () => void;
}

export function ShareDialogGeneral({
  document,
  fullAccess,
  onSetGeneralAccess,
  className,
  ...props
}: Props) {
  const [permissionsGroup, setPermissionsGroup] =
    useState<DocumentPermissionGroup>(document.generalPermissions.group);
  const [permissionType, setPermissionType] = useState<DocumentPermissionType>(
    document.generalPermissions.type
  );

  // When default access changed by another connected user, update UI
  useEffect(() => {
    setPermissionsGroup(document.generalPermissions.group);
    setPermissionType(document.generalPermissions.type);
  }, [document]);

  const [isLoading, setIsLoading] = useState<"group" | "type" | null>(null);

  // Handle permission change
  async function handlePermissionChange({
    group,
    type,
    loading,
  }: {
    group: DocumentPermissionGroup;
    type: DocumentPermissionType;
    loading: "group" | "type";
  }) {
    setPermissionsGroup(group);
    setPermissionType(type);
    setIsLoading(loading);

    const { data, error } = await updateGeneralAccess({
      documentId: document.id,
      permissionGroup: group,
      permissionType: type,
    });

    setIsLoading(null);

    if (error || !data) {
      // Revert on error
      setPermissionsGroup(document.generalPermissions.group);
      setPermissionType(document.generalPermissions.type);
      return;
    }

    onSetGeneralAccess();
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
  const organizationIcon =
    !isLoadingOrganizations && documentOrganization ? (
      <Image
        src={documentOrganization?.avatar ?? ""}
        alt={documentOrganization?.name ?? ""}
        width={24}
        height={24}
      />
    ) : null;

  return (
    <>
      <div className={clsx(className, styles.default)} {...props}>
        <div className={styles.section}>
          <div className={styles.sectionStart}>
            <div className={styles.sectionIcon}>
              {permissionsGroup === "private" ? <LockIcon /> : null}
              {permissionsGroup === "organization" ? organizationIcon : null}
              {permissionsGroup === "public" ? <EarthIcon /> : null}
            </div>

            <div>
              <Select
                loading={isLoading === "group"}
                disabled={!fullAccess}
                inlineDescription
                variant="subtle"
                aboveOverlay
                value={permissionsGroup}
                items={[
                  {
                    title: "Private",
                    value: "private",
                    description: "Only you have access",
                    icon: <LockIcon />,
                  },
                  {
                    title: isLoadingOrganizations
                      ? "Loading…"
                      : (documentOrganization?.name ?? "Undefined"),
                    value: "organization",
                    description: `Only organization members have access`,
                    icon: organizationIcon,
                  },
                  {
                    title: "Anyone with a link",
                    value: "public",
                    description: `Anyone on the internet can access`,
                    icon: <EarthIcon />,
                  },
                ]}
                onChange={(value: DocumentPermissionGroup) => {
                  // When changing the group, always set to "read" first
                  handlePermissionChange({
                    group: value,
                    type: "read",
                    loading: "group",
                  });
                }}
              />
            </div>
          </div>

          <div className={styles.sectionAction}>
            {permissionsGroup !== "private" ? (
              <Select
                loading={isLoading === "type"}
                disabled={!fullAccess}
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
                    loading: "type",
                  });
                }}
                value={permissionType}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
