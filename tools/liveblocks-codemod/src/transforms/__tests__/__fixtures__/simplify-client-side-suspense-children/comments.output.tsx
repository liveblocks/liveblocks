/* eslint-disable */
// @ts-nocheck
import { ClientSideSuspense } from "@liveblocks/react";

function Component() {
  return (
    <div>
      <ClientSideSuspense fallback={<Loading />}>
        <div />
      </ClientSideSuspense>
      <ClientSideSuspense fallback={<Loading />}>
        <div />
      </ClientSideSuspense>
      <ClientSideSuspense fallback={<Loading />}>
        <div>
          {
            // Will be kept?
          }
        </div>
      </ClientSideSuspense>
    </div>
  );
}
