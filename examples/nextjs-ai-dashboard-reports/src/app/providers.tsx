"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode, Suspense } from "react";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import { CommentsSidebarProvider } from "@/components/comments/CommentsSidebarContext";
import { InvitedUsersProvider } from "@/lib/useInvitedUsers";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <InvitedUsersProvider>
      <CommentsSidebarProvider>
        <LiveblocksProvider
          authEndpoint={authWithExampleId("/api/liveblocks-auth")}
          resolveUsers={async ({ userIds }) => {
            const searchParams = new URLSearchParams(
              userIds.map((userId) => ["userIds", userId]),
            );
            const response = await fetch(`/api/users?${searchParams}`);

            if (!response.ok) {
              throw new Error("Problem resolving users");
            }

            return response.json();
          }}
          resolveMentionSuggestions={async ({ text }) => {
            const response = await fetch(
              `/api/users/search?text=${encodeURIComponent(text)}`,
            );

            if (!response.ok) {
              throw new Error("Problem resolving mention suggestions");
            }

            return response.json();
          }}
          badgeLocation="bottom-left"
        >
          <SWRConfig
            value={{
              refreshInterval: 3000,
              fetcher: (resource, init) =>
                fetch(resource, init).then((res) => res.json()),
            }}
          >
            <ThemeProvider
              defaultTheme="system"
              disableTransitionOnChange
              attribute="class"
            >
              <Toaster position="top-right" richColors />
              <NuqsAdapter>
                <Suspense fallback={null}>{children}</Suspense>
              </NuqsAdapter>
            </ThemeProvider>
          </SWRConfig>
        </LiveblocksProvider>
      </CommentsSidebarProvider>
    </InvitedUsersProvider>
  );
}

// Not needed, just used to deploy to https://liveblocks.io/examples
function authWithExampleId(endpoint: string) {
  return async (room?: string): Promise<{ token: string }> => {
    let userId = localStorage.getItem("liveblocks-example-id");
    if (!userId) {
      userId = Math.random().toString(36).substring(2);
      localStorage.setItem("liveblocks-example-id", userId);
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, userId }),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        text.startsWith("Authentication failed")
          ? text
          : `Authentication failed: ${text.slice(0, 120)}`,
      );
    }

    if (!response.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : `HTTP ${response.status}`;
      throw new Error(message);
    }

    if (typeof data !== "object" || data === null || !("token" in data)) {
      throw new Error("Invalid authentication response");
    }
    const token = (data as { token: unknown }).token;
    if (typeof token !== "string") {
      throw new Error("Invalid authentication response");
    }

    return { token };
  };
}
