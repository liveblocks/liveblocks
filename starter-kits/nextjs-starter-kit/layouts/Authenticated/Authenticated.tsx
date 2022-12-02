import { PropsWithChildren } from "react";
import { Session } from "next-auth";
import { useRouter } from "next/router";

type Props = PropsWithChildren<{ session: Session }>;

export function AuthenticatedLayout({ children, session }: Props) {
  const router = useRouter();

  // Redirect if not logged in
  if (!session) {
    router.replace("/");
  }

  return <>{children}</>;
}
