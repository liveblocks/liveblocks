"use client";

import clsx from "clsx";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { getUsers } from "@/lib/database";

export function SignIn({
  onSignIn,
}: {
  onSignIn: (userId: string) => Promise<void>;
}) {
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const users = getUsers();

  const handleSignIn = async (userId: string) => {
    setPendingUserId(userId);
    setError(null);
    try {
      await onSignIn(userId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in");
      setPendingUserId(null);
    }
  };

  return (
    <main className="flex h-dvh w-full items-center justify-center bg-sidebar p-6">
      <section
        aria-labelledby="sign-in-heading"
        className="w-full max-w-sm rounded-lg bg-white p-6 text-neutral-900 shadow-xl"
      >
        <h1 id="sign-in-heading" className="text-lg font-semibold">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Pick a demo user.</p>

        <ul className="mt-5 flex flex-col gap-1" aria-label="Demo accounts">
          {users.map((user) => {
            const pending = pendingUserId === user.id;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  disabled={pendingUserId !== null}
                  aria-busy={pending || undefined}
                  onClick={() => handleSignIn(user.id)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-md border border-neutral-200 px-3 py-2 text-left text-sm transition",
                    "hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-default disabled:opacity-60",
                    pending && "border-brand-300 bg-brand-50"
                  )}
                >
                  <span className="inline-block size-8 shrink-0 overflow-hidden rounded-md">
                    <img
                      src={user.info.avatar}
                      alt=""
                      className="size-full object-cover"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {user.info.name}
                    </span>
                    <span className="truncate text-xs text-neutral-500">
                      {user.id}
                    </span>
                  </span>
                  {pending ? (
                    <Loader2Icon
                      className="size-4 shrink-0 animate-spin text-brand-600"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
