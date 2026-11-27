"use client";

import { LiveObject } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RoomProvider,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { nanoid } from "nanoid";
import { Suspense, useCallback, useMemo, useState } from "react";
import { Loading } from "@/components/loading";
import { Planner } from "@/components/planner";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import {
  createPlanListStorage,
  createPlanStorage,
  NEW_PLAN_NAME,
} from "@/lib/templates";

export default function Page() {
  return (
    // `useSearchParams` (used for the room ids) needs a Suspense boundary.
    <Suspense fallback={<Loading />}>
      <PlanList />
    </Suspense>
  );
}

/**
 * The outer room: the list of plans, shared by everyone. Its name is the
 * only thing a plan keeps here, so renaming or adding a plan shows up in
 * everyone's plan switcher right away.
 */
function PlanList() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null, selection: null }}
      // Only applies the first time the room is opened.
      initialStorage={createPlanListStorage}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <OpenPlan />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

/**
 * The inner room: the plan that's open. Hooks called below its RoomProvider
 * (in `Planner`) read and write the floor plan; the ones called here still
 * belong to the list of plans, and are handed down as props.
 */
function OpenPlan() {
  const plansById = useStorage((root) => root.plans);
  const plans = useMemo(
    () =>
      Object.values(plansById).sort(
        (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)
      ),
    [plansById]
  );

  // Which plan is open is local: everyone picks their own.
  const [planId, setPlanId] = useState<string | null>(null);
  const plan = plans.find((item) => item.id === planId) ?? plans.at(0);
  const roomId = useExampleRoomId(plan?.id);

  const createPlan = useMutation(({ storage }) => {
    const id = nanoid(8);
    storage.get("plans").set(
      id,
      new LiveObject({
        id,
        name: NEW_PLAN_NAME,
        template: "blank",
        createdAt: Date.now(),
      })
    );
    return id;
  }, []);

  const renamePlan = useMutation(({ storage }, id: string, name: string) => {
    storage.get("plans").get(id)?.set("name", name);
  }, []);

  const handleCreatePlan = useCallback(() => {
    setPlanId(createPlan());
  }, [createPlan]);

  if (!plan) {
    return <Loading />;
  }

  return (
    <RoomProvider
      key={roomId}
      id={roomId}
      initialPresence={{ cursor: null, selection: null }}
      // Only applies the first time the room is opened, which is how a plan
      // gets its template.
      initialStorage={() => createPlanStorage(plan.template)}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <Planner
          plan={plan}
          plans={plans}
          onPlanChange={setPlanId}
          onCreatePlan={handleCreatePlan}
          onRenamePlan={renamePlan}
        />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
