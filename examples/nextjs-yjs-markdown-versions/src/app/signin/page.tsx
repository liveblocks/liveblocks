import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth/manager";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  if (session) {
    redirect(callbackUrl ?? "/docs");
  }

  return (
    <main className="bg-bg flex min-h-screen items-center justify-center p-6">
      <div className="bg-bg-elev border-border w-full max-w-sm rounded-2xl border p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),_0_8px_24px_rgba(0,0,0,0.04)]">
        <h1 className="text-text mb-1 text-2xl font-bold tracking-tight">
          Markdown Versions
        </h1>
        <p className="text-text-muted mb-6 text-sm">
          Multiplayer markdown editor with version history.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: callbackUrl ?? "/docs" });
          }}
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#111] bg-[#111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1f1f]"
          >
            <GitHubIcon />
            <span>Sign in with GitHub</span>
          </button>
        </form>

        <p className="text-text-muted mt-4 text-center text-xs">
          You will only see and edit your own documents.
        </p>
      </div>
    </main>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
