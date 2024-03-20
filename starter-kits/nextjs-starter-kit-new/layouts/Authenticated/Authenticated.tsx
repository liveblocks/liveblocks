import { redirect } from "next/navigation";
import { Session } from "next-auth";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{ session: Session }>;

export function AuthenticatedLayout({ children, session }: Props) {
  // If not logged in, go to marketing page
  if (session) {
    redirect("/");
  }

  return <>{children}</>;
}
