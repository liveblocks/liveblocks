"use client";

import { useCallback, useState } from "react";
import { getUser, getUsers } from "@/lib/database";
import { authClient } from "./auth-client";

export type CurrentUser =
  | { status: "loading" }
  | { status: "signed-out"; signIn: (userId: string) => Promise<void> }
  | {
      status: "signed-in";
      userId: string;
      preview: boolean;
      switchUser: (userId: string) => Promise<void>;
      signOut: (() => Promise<void>) | null;
    };

export function getPreviewUserId(previewIndex: number) {
  const users = getUsers();
  return users[Math.abs(previewIndex) % users.length].id;
}

export function useCurrentUser(previewIndex: number | null): CurrentUser {
  const [previewOverride, setPreviewOverride] = useState<{
    index: number;
    userId: string;
  } | null>(null);
  const session = authClient.useSession();

  const signIn = useCallback(async (userId: string) => {
    const result = await authClient.signIn.demo({ userId });
    if (result.error) {
      throw new Error(result.error.message ?? "Could not sign in");
    }
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  const switchPreviewUser = useCallback(
    async (userId: string) => {
      if (previewIndex !== null && getUser(userId)) {
        setPreviewOverride({ index: previewIndex, userId });
      }
    },
    [previewIndex]
  );

  if (previewIndex !== null) {
    return {
      status: "signed-in",
      userId:
        previewOverride?.index === previewIndex
          ? previewOverride.userId
          : getPreviewUserId(previewIndex),
      preview: true,
      switchUser: switchPreviewUser,
      signOut: null,
    };
  }

  if (session.isPending) {
    return { status: "loading" };
  }

  const sessionUserId = session.data?.user.id;
  if (!sessionUserId || !getUser(sessionUserId)) {
    return { status: "signed-out", signIn };
  }

  return {
    status: "signed-in",
    userId: sessionUserId,
    preview: false,
    switchUser: signIn,
    signOut,
  };
}
