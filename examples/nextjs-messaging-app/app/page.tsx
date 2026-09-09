import { Suspense } from "react";
import { App, AppLoadingFallback } from "./app";

export default function Page() {
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <App />
    </Suspense>
  );
}
