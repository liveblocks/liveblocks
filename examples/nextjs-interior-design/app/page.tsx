"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { Suspense, useState } from "react";
import { Loading } from "@/components/loading";
import { Planner } from "@/components/planner";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import {
  createInitialStorage,
  DEFAULT_PLAN_ID,
  getPlan,
  type PlanId,
} from "@/lib/templates";

export default function Page() {
  return (
    // `useSearchParams` (used for the room id) needs a Suspense boundary.
    <Suspense fallback={<Loading />}>
      <Plan />
    </Suspense>
  );
}

function Plan() {
  const [planId, setPlanId] = useState<PlanId>(DEFAULT_PLAN_ID);
  const roomId = useExampleRoomId(planId);

  return (
    // Every plan is its own Liveblocks room. `initialStorage` only applies
    // the first time a room is opened, which is how a plan gets its template.
    <RoomProvider
      key={roomId}
      id={roomId}
      initialPresence={{ cursor: null, selection: null }}
      initialStorage={() => createInitialStorage(planId)}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <Planner plan={getPlan(planId)} onPlanChange={setPlanId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
