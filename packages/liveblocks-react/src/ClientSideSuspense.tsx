import type { ReactElement, ReactNode } from "react";
import * as React from "react";

type Props = {
  fallback: NonNullable<ReactNode> | null;
  children: () => ReactNode | undefined;
};

/**
 * Almost like a normal <Suspense> component, except that for server-side
 * renders, the fallback will be used.
 *
 * The child props will have to be provided in a function, i.e. change:
 *
 *   <Suspense fallback={<Loading />}>
 *     <MyRealComponent a={1} />
 *   </Suspense>
 *
 * To:
 *
 *   <ClientSideSuspense fallback={<Loading />}>
 *     {() => <MyRealComponent a={1} />}
 *   </ClientSideSuspense>
 *
 */
export function ClientSideSuspense(props: Props): ReactElement {
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
