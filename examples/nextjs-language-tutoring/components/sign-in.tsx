"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { getUsers } from "@/app/database";
import { useApp } from "./app-context";
import { HelpButton } from "./help-button";
import { Button } from "./ui/button";
import { UserAvatar } from "./user-avatar";

export function SignIn() {
  const { googleEnabled, signInDemo, signInGoogle } = useApp();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<void>) {
    setPending(key);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in");
      setPending(null);
    }
  }

  return (
    <main className="flex h-full min-h-full w-full items-center justify-center p-6">
      <section
        aria-labelledby="sign-in-heading"
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow ring-1 ring-neutral-950/5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 id="sign-in-heading" className="text-lg font-semibold">
              Language tutoring
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Private lesson rooms with shared documents, whiteboards, PDFs,
              and chat.
            </p>
          </div>
          <HelpButton />
        </div>

        {googleEnabled ? (
          <Button
            variant="outline"
            className="mt-6 w-full"
            disabled={pending !== null}
            onClick={() => run("google", signInGoogle)}
          >
            {pending === "google" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>
        ) : (
          <>
            <p className="mt-6 text-xs font-medium tracking-wide text-neutral-400 uppercase">
              Try a demo account
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Set <code>GOOGLE_CLIENT_ID</code> and{" "}
              <code>GOOGLE_CLIENT_SECRET</code> to enable Google sign-in.
            </p>
            <ul className="mt-3 flex flex-col gap-1" aria-label="Demo accounts">
              {getUsers().map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    disabled={pending !== null}
                    aria-busy={pending === user.id || undefined}
                    onClick={() => run(user.id, () => signInDemo(user.id))}
                    className="flex w-full items-center gap-3 rounded-md border border-neutral-200 px-3 py-2 text-left text-sm transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-default disabled:opacity-60"
                  >
                    <UserAvatar info={user.info} size={32} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">
                        {user.info.name}
                      </span>
                      <span className="truncate text-xs text-neutral-500">
                        {user.id}
                      </span>
                    </span>
                    {pending === user.id ? (
                      <Loader2Icon
                        className="size-4 shrink-0 animate-spin text-neutral-500"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}
