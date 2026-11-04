"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { getColorForUserId, getUser, getUsers } from "@/app/database";
import { type ApiContext, api, apiBytes } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import {
  type ExampleParams,
  parseExampleParams,
  withExampleParams,
} from "@/lib/example";

export type CurrentUser = Liveblocks["UserMeta"] & { external: boolean };

export type AppContextValue = {
  params: ExampleParams;
  // Null while the session is loading, undefined when signed out
  user: CurrentUser | null | undefined;
  // Whether "Sign in with Google" is configured on the server
  googleEnabled: boolean;
  // tldraw license key (TLDRAW_LICENSE_KEY), undefined when not set
  tldrawLicenseKey: string | undefined;
  // In gallery preview mode the pane is signed in as a fixed demo user
  isPreview: boolean;
  signInDemo: (userId: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // Fetch helper forwarding gallery params to the API routes
  api: <T>(path: string, init?: Parameters<typeof api>[2]) => Promise<T>;
  // Same forwarding, for binary responses such as a proxied PDF
  bytes: (path: string) => Promise<ArrayBuffer>;
  // Preserve gallery params when linking within the app
  href: (path: string) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  googleEnabled,
  tldrawLicenseKey,
  children,
}: PropsWithChildren<{ googleEnabled: boolean; tldrawLicenseKey?: string }>) {
  const searchParams = useSearchParams();
  const params = useMemo(
    () => parseExampleParams(searchParams),
    [searchParams]
  );
  const session = authClient.useSession();

  const previewUser =
    params.examplePreview !== null
      ? getUsers()[params.examplePreview % getUsers().length]
      : null;

  const user = useMemo<CurrentUser | null | undefined>(() => {
    if (previewUser) {
      return { ...previewUser, external: false };
    }
    if (session.isPending) {
      return null;
    }
    const sessionUser = session.data?.user;
    if (!sessionUser) {
      return undefined;
    }
    // Mirrors `getSessionUser` in `lib/auth.ts`
    const email = sessionUser.email.toLowerCase();
    const demoUser = getUser(email);
    if (demoUser) {
      return { ...demoUser, external: false };
    }
    if (!sessionUser.emailVerified) {
      return undefined;
    }
    return {
      id: email,
      external: true,
      info: {
        name: sessionUser.name || email,
        avatar:
          sessionUser.image ||
          `https://liveblocks.io/api/avatar?u=${encodeURIComponent(email)}`,
        color: getColorForUserId(email),
      },
    };
  }, [previewUser, session.isPending, session.data]);

  const apiContext = useMemo<ApiContext>(
    () => ({ ...params, previewUserId: previewUser?.id ?? null }),
    [params, previewUser]
  );

  const signInDemo = useCallback(async (userId: string) => {
    const result = await authClient.signIn.demo({ userId });
    if (result.error) {
      throw new Error(result.error.message ?? "Could not sign in");
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.href,
    });
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      params,
      user,
      googleEnabled,
      tldrawLicenseKey,
      isPreview: previewUser !== null,
      signInDemo,
      signInGoogle,
      signOut,
      api: (path, init) => api(apiContext, path, init),
      bytes: (path) => apiBytes(apiContext, path),
      href: (path) => withExampleParams(path, params),
    }),
    [
      params,
      user,
      googleEnabled,
      tldrawLicenseKey,
      previewUser,
      signInDemo,
      signInGoogle,
      signOut,
      apiContext,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}

// The signed-in user; only call from screens that require a session
export function useCurrentUser() {
  const { user } = useApp();
  if (!user) {
    throw new Error("useCurrentUser requires a signed-in user");
  }
  return user;
}
