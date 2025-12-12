"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckIcon, SignOutIcon } from "@/icons";
import { getUserOrganizations } from "@/lib/actions/getUserOrganizations";
import { switchOrganization } from "@/lib/actions/switchOrganization";
import { Button } from "@/primitives/Button";
import { Organization } from "@/types";
import styles from "./DashboardHeader.module.css";

export function OrganizationPopoverContent() {
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    getUserOrganizations().then(setOrganizations);
  }, []);

  const currentOrganization = useMemo(() => {
    if (!session) {
      return null;
    }

    const currentId = session.user.currentOrganizationId;
    return (
      organizations.find((org) => org.id === currentId) || organizations[0]
    );
  }, [organizations, session]);

  const handleOrganizationChange = useCallback(
    async (organizationId: string) => {
      if (organizationId === session?.user.currentOrganizationId) {
        return;
      }

      const result = await switchOrganization(organizationId);

      if (result.error) {
        console.error("Failed to switch organization:", result.error);
        return;
      }

      // Refresh the page to re-authenticate with Liveblocks for the new tenant
      // This will cause the auth callback to read the new organization from the cookie
      window.location.reload();
    },
    [session]
  );

  if (!session) {
    return null;
  }

  return (
    <div className={styles.profilePopover}>
      <div className={styles.profilePopoverInfo}>
        <span className={styles.profilePopoverName}>
          {session.user.info.name}
        </span>
        <span className={styles.profilePopoverId}>{session.user.info.id}</span>
      </div>
      {organizations.length > 0 && (
        <div className={styles.organizationsSection}>
          <div className={styles.organizationsLabel}>Workplaces</div>
          {organizations.map((organization) => {
            const isSelected = organization.id === currentOrganization?.id;
            const avatar =
              organization.id === session.user.info.id
                ? session.user.info.avatar
                : organization.avatar;

            return (
              <button
                key={organization.id}
                className={styles.organizationItem}
                onClick={() => handleOrganizationChange(organization.id)}
              >
                {avatar && (
                  <img
                    src={avatar}
                    alt={organization.name}
                    className={styles.organizationItemAvatar}
                  />
                )}
                <span className={styles.organizationItemName}>
                  {organization.name}
                </span>
                {isSelected && <CheckIcon className={styles.checkIcon} />}
              </button>
            );
          })}
        </div>
      )}
      <div className={styles.profilePopoverActions}>
        <Button
          className={styles.profilePopoverButton}
          icon={<SignOutIcon />}
          onClick={() => signOut()}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
