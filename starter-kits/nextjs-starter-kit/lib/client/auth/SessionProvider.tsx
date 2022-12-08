import {
  SessionProvider as NextAuthSessionProvider,
  SessionProviderProps,
} from "next-auth/react";

export function SessionProvider(props: SessionProviderProps) {
  return (
    <NextAuthSessionProvider {...props}>
      {props.children}
    </NextAuthSessionProvider>
  );
}
