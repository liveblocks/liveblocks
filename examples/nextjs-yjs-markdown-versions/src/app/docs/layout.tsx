import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { auth, signOut } from "@/auth/manager";

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="bg-bg-elev border-border flex h-[52px] flex-none items-center justify-between border-b px-4">
        <div className="text-sm font-bold tracking-tight">Markdown Versions</div>
        <div className="flex items-center gap-2.5">
          <span className="text-text-muted text-[13px]">
            {session.user.name ?? session.user.githubLogin ?? "Signed in"}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button
              type="submit"
              className="border-border-strong text-text hover:bg-bg-muted h-[30px] cursor-pointer rounded-lg border bg-transparent px-3 text-xs font-semibold"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
