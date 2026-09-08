import { signIn } from "@/auth";

/**
 * Shown when there's no session. Signing in with GitHub is what identifies
 * people in the chat; the agent itself runs on the server's Cursor key.
 */
export function SignInScreen() {
  const org = process.env.GITHUB_ALLOWED_ORG;

  return (
    <main className="flex h-dvh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent-foreground">
          <SparklesIcon />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Coding Agents</h1>
        <p className="mt-2 text-sm text-muted">
          A shared chat where your team works with a coding agent on your
          repositories. Sign in with GitHub to join.
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
        </form>

        {org ? (
          <p className="mt-4 text-xs text-subtle">
            Members of the <span className="font-medium">{org}</span>{" "}
            organization can talk to the agent. Anyone else can watch.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function GitHubIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}
