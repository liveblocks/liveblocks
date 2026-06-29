import type {
  BaseMetadata,
  BaseUserMeta,
  Json,
  JsonObject,
  ThreadVisibility,
} from "@liveblocks/core";
import {
  createRoomContext,
  useErrorListener,
  useSyncStatus,
} from "@liveblocks/react";
import { useEffect, useMemo, useState } from "react";

import { getRoomFromUrl, Row } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

const E2E_CASE = "visibility-threads";

type VisibilityFilter = ThreadVisibility | "all";
type PageMode = "read" | "create";

const client = createLiveblocksClient({
  authEndpoint: async () => {
    const params = new URLSearchParams();
    const user = getOptionalUrlParam("user");
    const permissions = getUrlParamValues("permissions");

    if (user !== undefined) {
      params.set("user", user);
    }

    for (const permission of permissions) {
      params.append("permissions", permission);
    }

    const query = params.toString();
    const response = await fetch(
      query ? `/api/auth/access-token?${query}` : "/api/auth/access-token"
    );

    return response.json();
  },
});

const { RoomProvider, useThreads, useCreateThread } = createRoomContext<
  JsonObject,
  never,
  BaseUserMeta,
  Json,
  BaseMetadata
>(client);

export default function Home() {
  const roomId = getRoomFromUrl();

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const params = usePageParams();

  if (params === undefined) {
    return null;
  }

  if (params.mode === "create") {
    return <CreateSandbox runId={params.runId} visibility={params.visibility} />;
  }

  return <ReadSandbox runId={params.runId} visibility={params.visibility} />;
}

function ReadSandbox({
  runId,
  visibility,
}: {
  runId: string;
  visibility: VisibilityFilter;
}) {
  const createThread = useCreateThread();
  const syncStatus = useSyncStatus({ smooth: true });
  const isSynced = syncStatus === "synchronized";

  const metadata = useMemo(
    () => ({
      e2eCase: E2E_CASE,
      e2eRun: runId,
    }),
    [runId]
  );

  const query = useMemo(
    () => (visibility === "all" ? undefined : { visibility }),
    [visibility]
  );

  const result = useThreads(query === undefined ? {} : { query });
  const threads = result.threads ?? [];
  const publicThreads = threads.filter(
    (thread) => thread.visibility === "public"
  );
  const privateThreads = threads.filter(
    (thread) => thread.visibility === "private"
  );
  const threadVisibilities = threads
    .map((thread) => thread.visibility)
    .sort();
  const error = "error" in result ? result.error?.message : undefined;

  return (
    <>
      <table>
        <tbody>
          <Row id="visibility" name="Visibility" value={visibility} />
          <Row id="syncStatus" name="Sync status" value={syncStatus} />
          <Row id="isSynced" name="Is synchronized?" value={isSynced} />
          <Row id="isLoading" name="Is loading?" value={result.isLoading} />
          <Row id="error" name="Error" value={error} />
          <Row id="threadCount" name="Thread count" value={threads.length} />
          <Row
            id="publicThreadCount"
            name="Public thread count"
            value={publicThreads.length}
          />
          <Row
            id="privateThreadCount"
            name="Private thread count"
            value={privateThreads.length}
          />
          <Row
            id="threadVisibilities"
            name="Thread visibilities"
            value={threadVisibilities}
          />
        </tbody>
      </table>

      {visibility === "all" ? null : (
        <Button
          id="create-thread"
          onClick={() => {
            createThread({
              body: {
                version: 1,
                content: [
                  {
                    type: "paragraph",
                    children: [
                      {
                        text: `${visibility} thread ${runId}`,
                      },
                    ],
                  },
                ],
              },
              metadata,
              visibility,
            });
          }}
        >
          Create {visibility} thread
        </Button>
      )}
    </>
  );
}

function CreateSandbox({
  runId,
  visibility,
}: {
  runId: string;
  visibility: VisibilityFilter;
}) {
  const createThread = useCreateThread();
  const syncStatus = useSyncStatus({ smooth: true });
  const [error, setError] = useState<
    | {
        message: string;
        cause: string | undefined;
        contextType: string | undefined;
      }
    | undefined
  >();

  const metadata = useMemo(
    () => ({
      e2eCase: E2E_CASE,
      e2eRun: runId,
    }),
    [runId]
  );

  useErrorListener((err) => {
    setError({
      message: err.message,
      cause: err.cause instanceof Error ? err.cause.message : undefined,
      contextType: err.context.type,
    });
  });

  return (
    <>
      <table>
        <tbody>
          <Row id="visibility" name="Visibility" value={visibility} />
          <Row id="syncStatus" name="Sync status" value={syncStatus} />
          <Row id="error" name="Error" value={error?.message} />
          <Row id="errorCause" name="Error cause" value={error?.cause} />
          <Row
            id="errorContextType"
            name="Error context"
            value={error?.contextType}
          />
        </tbody>
      </table>

      {visibility === "all" ? null : (
        <Button
          id="create-thread"
          onClick={() => {
            createThread({
              body: {
                version: 1,
                content: [
                  {
                    type: "paragraph",
                    children: [
                      {
                        text: `${visibility} thread ${runId}`,
                      },
                    ],
                  },
                ],
              },
              metadata,
              visibility,
            });
          }}
        >
          Create {visibility} thread
        </Button>
      )}
    </>
  );
}

function usePageParams() {
  const [params, setParams] = useState<
    | {
        runId: string;
        visibility: VisibilityFilter;
        mode: PageMode;
      }
    | undefined
  >();

  useEffect(() => {
    setParams({
      runId: getRunIdFromUrl(),
      visibility: getVisibilityFilterFromUrl(),
      mode: getPageModeFromUrl(),
    });
  }, []);

  return params;
}

function getPageModeFromUrl(): PageMode {
  if (typeof window === "undefined") {
    return "read";
  }

  const mode = getOptionalUrlParam("mode");
  if (mode === undefined || mode === "read") {
    return "read";
  }

  if (mode === "create") {
    return mode;
  }

  throw new Error("Specify ?mode=read or ?mode=create in URL");
}

function getOptionalUrlParam(name: string): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return new URL(window.location.href).searchParams.get(name) ?? undefined;
}

function getUrlParamValues(name: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  return new URL(window.location.href).searchParams.getAll(name);
}

function getRunIdFromUrl(): string {
  if (typeof window === "undefined") {
    return "run-id-placeholder-for-ssr";
  }

  const runId = getOptionalUrlParam("run");
  if (runId === undefined) {
    throw new Error("Specify ?run= in URL, please");
  }

  return runId;
}

function getVisibilityFilterFromUrl(): VisibilityFilter {
  if (typeof window === "undefined") {
    return "all";
  }

  const visibility = getOptionalUrlParam("visibility");
  if (visibility === "all") {
    return visibility;
  }

  if (visibility === "public" || visibility === "private") {
    return visibility;
  }

  throw new Error(
    "Specify ?visibility=all, ?visibility=public, or ?visibility=private in URL"
  );
}
