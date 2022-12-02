import {
  SessionProvider as NextAuthSessionProvider,
  SessionProviderProps,
} from "next-auth/react";
import { AUTHENTICATION_DEMO_MODE } from "../../../liveblocks.config";

export function SessionProvider(props: SessionProviderProps) {
  if (AUTHENTICATION_DEMO_MODE) {
    return <>{props.children}</>;
  }

  return (
    <NextAuthSessionProvider {...props}>
      {props.children}
    </NextAuthSessionProvider>
  );
}
