import { redirect } from "next/navigation";

import { auth } from "@/auth/manager";

export default async function HomePage() {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }
  redirect("/docs");
}
