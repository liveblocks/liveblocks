"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EyeOffIcon } from "lucide-react";
import { Switch } from "radix-ui";
import {
  RoomProvider,
  useSelf,
  useThreads,
  useUser,
} from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import {
  EXTERNAL_USER_TYPE,
  getUserType,
  INTERNAL_USER_TYPE,
  USER_SEARCH_PARAM,
  type UserType,
} from "@/user";

function Example({
  userType,
  onUserTypeChange,
}: {
  userType: UserType;
  onUserTypeChange: (userType: UserType) => void;
}) {
  const isInternalUser = userType === INTERNAL_USER_TYPE;
  const { threads } = useThreads();
  const [isPrivateThread, setPrivateThread] = useState(false);
  const isComposerPrivate = isInternalUser && isPrivateThread;

  return (
    <>
      <main>
        <UserCard userType={userType} onUserTypeChange={onUserTypeChange} />

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
          <Composer visibility={isComposerPrivate ? "private" : undefined} />
          {isInternalUser ? (
            <div className="composer-visibility">
              <Switch.Root
                id="composer-visibility-switch"
                className="switch composer-visibility-switch"
                checked={isComposerPrivate}
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
          ) : null}
        </div>
      </main>
    </>
  );
}

function UserCard({
  userType,
  onUserTypeChange,
}: {
  userType: UserType;
  onUserTypeChange: (userType: UserType) => void;
}) {
  const userId = useSelf((me) => me.id);
  const { user } = useUser(userId);
  const isInternalUser = userType === INTERNAL_USER_TYPE;

  return (
    <section className="lb-root user-card">
      <div className="user-card-profile">
        <img className="user-card-avatar" src={user.avatar} alt="" />
        <div className="user-card-text">
          <div className="user-card-name">{user.name}</div>
          <div className="user-card-access">
            {isInternalUser ? "Internal user" : "External user"}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="user-card-button"
        onClick={() =>
          onUserTypeChange(
            isInternalUser ? EXTERNAL_USER_TYPE : INTERNAL_USER_TYPE
          )
        }
      >
        {isInternalUser ? "Switch to external user" : "Switch to internal user"}
      </button>
    </section>
  );
}

export default function Page() {
  const params = useSearchParams();
  const userType = getUserType(params);
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-comments-private"
  );
  const setUserType = useCallback(
    (nextUserType: UserType) => {
      if (nextUserType === userType) {
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.set(USER_SEARCH_PARAM, nextUserType);
      window.location.assign(url.toString());
    },
    [userType]
  );

  return (
    <RoomProvider id={roomId} key={`${roomId}:${userType}`}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Example userType={userType} onUserTypeChange={setUserType} />
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
