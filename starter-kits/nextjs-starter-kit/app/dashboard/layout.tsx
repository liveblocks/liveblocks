import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { auth } from "@/auth";
import { DashboardLayout } from "@/layouts/Dashboard";

export default async function Dashboard({ children }: { children: ReactNode }) {
  const session = await auth();

  // If not logged in, go to marketing page
  if (!session) {
    redirect("/");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
