import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { auth, signOut } from "@/auth/manager";
import styles from "./layout.module.css";

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>Markdown Versions</div>
        <div className={styles.userArea}>
          <span className={styles.userName}>
            {session.user.name ?? session.user.githubLogin ?? "Signed in"}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button type="submit" className={styles.signoutButton}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
