"use client";

import clsx from "clsx";
import { ComponentProps } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useUser } from "@liveblocks/react/suspense";
import { useExampleUserId } from "../example.client";
import { ClientSideSuspense } from "@liveblocks/react";

function Avatar({ className, ...props }: ComponentProps<"div">) {
  const userId = useExampleUserId();
  const { user } = useUser(userId);

  return (
    <div className={clsx(className, "avatar")} {...props}>
      <img src={user.avatar} alt={user.name} title={user.name} />
    </div>
  );
}

export function User({ className, ...props }: ComponentProps<"div">) {
  const fallback = <div className={clsx(className, "avatar")} />;

  return (
    <ErrorBoundary fallback={fallback}>
      <ClientSideSuspense fallback={fallback}>
        <Avatar className={className} {...props} />
      </ClientSideSuspense>
    </ErrorBoundary>
  );
}
