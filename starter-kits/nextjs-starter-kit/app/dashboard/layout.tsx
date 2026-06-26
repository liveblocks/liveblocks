import { redirect } from "next/navigation";
import { ReactNode, Suspense } from "react";
import { auth } from "@/auth";
import { DashboardLayout, DashboardLayoutSkeleton } from "@/layouts/Dashboard";

export default function Dashboard({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}

async function AuthenticatedDashboard({ children }: { children: ReactNode }) {
  const session = await auth();

  // If not logged in, go to marketing page
  if (!session) {
    redirect("/");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
