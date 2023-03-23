import clsx from "clsx";
import { ComponentProps, FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { PlusIcon } from "../../icons";
import { updateGroupAccess } from "../../lib/client";
import { Button } from "../../primitives/Button";
import { Select } from "../../primitives/Select";
import { Spinner } from "../../primitives/Spinner";
import { Document, DocumentAccess, DocumentGroup, Group } from "../../types";
import styles from "./ShareDialogInvite.module.css";
import { capitalize } from "../../utils";

interface Props extends ComponentProps<"div"> {
  documentId: Document["id"];
  fullAccess: boolean;
  currentGroups: Group[];
  onSetGroups: () => void;
}

export function ShareDialogInviteGroup({
  documentId,
  fullAccess,
  onSetGroups,
  className,
  currentGroups,
  ...props
}: Props) {
  const { data: session } = useSession();

  const [isInviteLoading, setInviteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  // Add a group to the room
  async function handleAddDocumentGroup(id: DocumentGroup["id"]) {
    setErrorMessage(undefined);
    setInviteLoading(true);

    const { error } = await updateGroupAccess({
      groupId: id,
      documentId: documentId,
      access: DocumentAccess.READONLY,
    });

    setInviteLoading(false);

    if (error) {
      setErrorMessage(error?.suggestion);
      return;
    }

    onSetGroups();
  }

  const invitableGroupIds = (session?.user.info.groupIds ?? []).filter(
    (groupId) => currentGroups.every((group) => group.id !== groupId)
  );

  return (
    <div className={clsx(className, styles.section)} {...props}>
      {fullAccess ? (
        <>
          {!session || invitableGroupIds.length ? (
            <form
              className={styles.inviteForm}
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const id = new FormData(e.currentTarget).get(
                  "groupId"
                ) as string;
                handleAddDocumentGroup(id);
              }}
            >
              <Select
                key={currentGroups[0]?.id || undefined}
                aboveOverlay
                name="groupId"
                className={styles.inviteSelect}
                items={invitableGroupIds.map((groupId) => ({
                  value: groupId,
                  title: capitalize(groupId),
                }))}
                placeholder="Choose a group…"
                required
                disabled={isInviteLoading}
              />
              <Button
                className={styles.inviteButton}
                icon={isInviteLoading ? <Spinner /> : <PlusIcon />}
                disabled={isInviteLoading}
              >
                Invite
              </Button>
            </form>
          ) : (
            <div className={clsx(styles.error, styles.inviteFormMessage)}>
              All of your groups have already been added.
            </div>
          )}
          {errorMessage && (
            <div className={clsx(styles.error, styles.inviteFormMessage)}>
              {errorMessage}
            </div>
          )}
        </>
      ) : (
        <div className={styles.error}>
          You need full access to invite groups.
        </div>
      )}
    </div>
  );
}
