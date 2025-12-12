"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckIcon } from "@/icons";
import { getUserOrganizations } from "@/lib/actions/getUserOrganizations";
import { switchOrganization } from "@/lib/actions/switchOrganization";
import { Popover } from "@/primitives/Popover";
import { Organization } from "@/types";
import styles from "./OrganizationSwitcher.module.css";

export function OrganizationSwitcher() {
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (session?.user?.info?.id) {
      getUserOrganizations().then(setOrganizations);
    }
  }, [session?.user?.info?.id]);

  const currentOrganization = useMemo(() => {
    const currentId =
      session?.user.currentOrganizationId || session?.user?.info?.id;
    return (
      organizations.find((org) => org.id === currentId) || organizations[0]
    );
  }, [organizations, session?.user]);

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

  if (!session || organizations.length === 0) {
    return null;
  }

  return (
    <Popover
      content={
        <div className={styles.popover}>
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
                    className={styles.avatar}
                  />
                )}
                <span className={styles.organizationName}>
                  {organization.name}
                </span>
                {isSelected && <CheckIcon className={styles.checkIcon} />}
              </button>
            );
          })}
        </div>
      }
      side="bottom"
      align="start"
    >
      <button className={styles.trigger}>
        {currentOrganization && (
          <>
            {currentOrganization.id === session.user.info.id
              ? session.user.info.avatar && (
                  <img
                    src={session.user.info.avatar}
                    alt={currentOrganization.name}
                    className={styles.avatar}
                  />
                )
              : currentOrganization.avatar && (
                  <img
                    src={currentOrganization.avatar}
                    alt={currentOrganization.name}
                    className={styles.avatar}
                  />
                )}
            <span className={styles.organizationName}>
              {currentOrganization.name}
            </span>
          </>
        )}
      </button>
    </Popover>
  );
}
