"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EyeOffIcon } from "lucide-react";
import { Switch } from "radix-ui";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { getUserType, INTERNAL_USER_TYPE, type UserType } from "@/user";

function Example({ userType }: { userType: UserType }) {
  const isInternalUser = userType === INTERNAL_USER_TYPE;
  const { threads } = useThreads();
  const [isPrivateThread, setPrivateThread] = useState(false);
  const isComposerPrivate = isInternalUser && isPrivateThread;

  return (
    <>
      <main>
        {threads.map((thread) => {
          return (
            <div
              key={thread.id}
              className="lb-root thread"
              data-visibility={thread.visibility}
            >
              {thread.visibility === "private" ? (
                <div className="thread-visibility">
                  <EyeOffIcon className="thread-visibility-icon" aria-hidden />
                  Not visible to external users
                </div>
              ) : null}
              <Thread thread={thread} />
            </div>
          );
        })}

        <div
          className="lb-root composer"
          data-visibility={isComposerPrivate ? "private" : undefined}
        >
          <Composer
            collapsed={false}
            visibility={isComposerPrivate ? "private" : undefined}
          />
          <div className="composer-visibility">
            <Switch.Root
              id="composer-visibility-switch"
              className="switch composer-visibility-switch"
              checked={isComposerPrivate}
              disabled={!isInternalUser}
              onCheckedChange={setPrivateThread}
            >
              <Switch.Thumb className="switch-thumb" />
            </Switch.Root>
            <label
              className="composer-visibility-label"
              htmlFor="composer-visibility-switch"
            >
              <span className="composer-visibility-label-title">
                Mark as private
              </span>
            </label>
            <span className="composer-visibility-description">
              It won't be visible to external users
            </span>
          </div>
        </div>
      </main>
    </>
  );
}

export default function Page() {
  const params = useSearchParams();
  const userType = getUserType(params);
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-comments-private"
  );

  return (
    <RoomProvider id={roomId} key={`${roomId}:${userType}`}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Example userType={userType} />
        </ClientSideSuspense>
      </ErrorBoundary>
    </RoomProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
