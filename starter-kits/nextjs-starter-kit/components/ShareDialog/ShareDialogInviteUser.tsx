import clsx from "clsx";
import { ComponentProps, FormEvent, useState } from "react";
import { PlusIcon } from "@/icons";
import { updateUserAccess } from "@/lib/actions";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Spinner } from "@/primitives/Spinner";
import { Document, DocumentAccess, DocumentUser } from "@/types";
import styles from "./ShareDialogInvite.module.css";

interface Props extends ComponentProps<"div"> {
  documentId: Document["id"];
  fullAccess: boolean;
  onSetUsers: () => void;
}

export function ShareDialogInviteUser({
  documentId,
  fullAccess,
  onSetUsers,
  className,
  ...props
}: Props) {
  const [isInviteLoading, setInviteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  // Add a user to the room using email as user id
  async function handleAddDocumentUser(id: DocumentUser["id"]) {
    setErrorMessage(undefined);
    setInviteLoading(true);

    const { error } = await updateUserAccess({
      userId: id,
      documentId: documentId,
      access: DocumentAccess.READONLY,
    });

    setInviteLoading(false);

    if (error) {
      setErrorMessage(error?.suggestion);
      return;
    }

    onSetUsers();
  }

  return (
    <div className={clsx(className, styles.section)} {...props}>
      {fullAccess ? (
        <>
          <form
            className={styles.inviteForm}
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const id = new FormData(e.currentTarget).get("userId") as string;
              handleAddDocumentUser(id);
            }}
          >
            <Input
              className={styles.inviteInput}
              disabled={isInviteLoading}
              name="userId"
              placeholder="Email address"
              required
              type="email"
            />
            <Button
              className={styles.inviteButton}
              disabled={isInviteLoading}
              icon={isInviteLoading ? <Spinner /> : <PlusIcon />}
            >
              Invite
            </Button>
          </form>
          {errorMessage && (
            <div className={clsx(styles.error, styles.inviteFormMessage)}>
              {errorMessage}
            </div>
          )}
        </>
      ) : (
        <div className={styles.error}>
          You need full access to invite others.
        </div>
      )}
    </div>
  );
}
