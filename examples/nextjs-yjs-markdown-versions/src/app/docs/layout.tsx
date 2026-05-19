import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { auth, signOut } from "@/auth/manager";

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  const displayName =
    session.user.name ?? session.user.githubLogin ?? "Signed in";
  const avatarUrl = session.user.image;

  return (
    <div className="flex h-screen flex-col">
      <header className="bg-bg-elev border-border flex h-[52px] flex-none items-center justify-between border-b px-4">
        <div className="text-sm font-bold tracking-tight">Markdown Versions</div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external avatar URL; small + cached
              <img
                src={avatarUrl}
                alt={displayName}
                width={24}
                height={24}
                className="border-border h-6 w-6 rounded-full border object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-bg-muted text-text-muted flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-text-muted text-[13px]">{displayName}</span>
          </div>
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
