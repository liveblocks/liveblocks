import { Suspense } from "react";
import { AppLoadingFallback, AppShell } from "@/views/app-shell";

export default function Page() {
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <AppShell />
    </Suspense>
  );
}
