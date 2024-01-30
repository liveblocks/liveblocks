import { useRouter } from "next/router";
import { Session } from "next-auth";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{ session: Session }>;

export function AuthenticatedLayout({ children, session }: Props) {
  const router = useRouter();

  // Redirect if not logged in
  if (!session) {
    router.replace("/");
  }

  return <>{children}</>;
}
