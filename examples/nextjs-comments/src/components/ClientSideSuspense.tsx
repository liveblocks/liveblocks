import React from "react";
import { ReactElement } from "react";

export function ClientSideSuspense(props: any): ReactElement {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // Effects are never executed on the server side. The point of this is to
    // delay the flipping of this boolean until after hydration has happened.
    setMounted(true);
  }, []);

  return (
    <React.Suspense fallback={props.fallback}>
      {mounted ? props.children() : props.fallback}
    </React.Suspense>
  );
}
