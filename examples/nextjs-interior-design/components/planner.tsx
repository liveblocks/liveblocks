"use client";

import { useStorage, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlanActions } from "@/hooks/use-plan-actions";
import type { FurnitureType } from "@/lib/catalog";
import type { Plan, Selection, Tool } from "@/lib/plan";
import { summarize } from "@/lib/templates";
import type { Unit } from "@/lib/units";
import { Canvas, type CanvasHandle } from "./canvas/canvas";
import { Header } from "./header";
import { Inspector } from "./inspector";
import { Sidebar } from "./sidebar";
import { Toolbar } from "./toolbar";
import { TooltipProvider } from "./ui/tooltip";

/**
 * The whole editor for one plan. The plan itself (rooms, doors and windows,
 * furniture) lives in Liveblocks Storage and is shared; the tool, the
 * selection, the units and the view are local to each person.
 */
export function Planner({
  plan,
  plans,
  onPlanChange,
  onCreatePlan,
  onRenamePlan,
  onSummarizePlan,
}: {
  plan: Plan;
  // The list of plans comes from another room: see `app/page.tsx`.
  plans: Plan[];
  onPlanChange: (planId: string) => void;
  onCreatePlan: () => void;
  onRenamePlan: (planId: string, name: string) => void;
  onSummarizePlan: (
    planId: string,
    summary: Pick<Plan, "roomCount" | "area">
  ) => void;
}) {
  // Storage is read as plain JSON: each LiveMap becomes an object keyed by
  // id, and only changes identity when something inside it changes. They're
  // turned into Maps here, which is what the rest of the editor works with.
  const roomsById = useStorage((root) => root.rooms);
  const openingsById = useStorage((root) => root.openings);
  const furnitureById = useStorage((root) => root.furniture);
  const rooms = useMemo(() => new Map(Object.entries(roomsById)), [roomsById]);
  const openings = useMemo(
    () => new Map(Object.entries(openingsById)),
    [openingsById]
  );
  const furniture = useMemo(
    () => new Map(Object.entries(furnitureById)),
    [furnitureById]
  );
  const actions = usePlanActions();

  // Keep the plan's entry in the list of plans (its room count and area) in
  // step with the floor plan. Everyone with the plan open computes the same
  // summary, so it doesn't matter who writes it; waiting for a pause keeps a
  // wall being dragged from rewriting it on every frame.
  const { roomCount, area } = useMemo(() => summarize(rooms.values()), [rooms]);
  const planId = plan.id;
  const stale = plan.roomCount !== roomCount || plan.area !== area;
  useEffect(() => {
    if (!stale) {
      return;
    }
    const timeout = setTimeout(
      () => onSummarizePlan(planId, { roomCount, area }),
      400
    );
    return () => clearTimeout(timeout);
  }, [stale, planId, roomCount, area, onSummarizePlan]);
  const updateMyPresence = useUpdateMyPresence();

  const canvasRef = useRef<CanvasHandle>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [picked, setPicked] = useState<Selection | null>(null);
  const [unit, setUnit] = useState<Unit>("metric");
  const [showDimensions, setShowDimensions] = useState(false);

  // Someone else may delete what you have selected, so the selection only
  // counts for as long as the thing it points at is still in the plan.
  const selection =
    picked &&
    (picked.kind === "room"
      ? rooms.has(picked.id)
      : picked.kind === "opening"
        ? openings.has(picked.id)
        : furniture.has(picked.id))
      ? picked
      : null;

  // Share the selection through Presence, so others see what you're holding.
  const selectionKind = selection?.kind;
  const selectionId = selection?.id;
  useEffect(() => {
    updateMyPresence({
      selection:
        selectionKind && selectionId
          ? { kind: selectionKind, id: selectionId }
          : null,
    });
  }, [selectionKind, selectionId, updateMyPresence]);

  const handleToolChange = useCallback((next: Tool) => {
    setTool(next);
    if (next !== "select") {
      setPicked(null);
    }
  }, []);

  const handleRenamePlan = useCallback(
    (name: string) => onRenamePlan(plan.id, name),
    [onRenamePlan, plan.id]
  );

  const handleAddFurniture = useCallback((type: FurnitureType) => {
    canvasRef.current?.addFurniture(type);
  }, []);
  const handleDropFurniture = useCallback(
    (type: FurnitureType, clientX: number, clientY: number) => {
      canvasRef.current?.dropFurniture(type, clientX, clientY);
    },
    []
  );
  const getZoom = useCallback(() => canvasRef.current?.getZoom() ?? 1, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh overflow-hidden bg-canvas text-ink sm:gap-1.5 sm:p-1.5">
        <Sidebar
          className="hidden sm:flex"
          plan={plan}
          plans={plans}
          onPlanChange={onPlanChange}
          onCreatePlan={onCreatePlan}
          unit={unit}
          onAddFurniture={handleAddFurniture}
          onDropFurniture={handleDropFurniture}
          getZoom={getZoom}
        />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface sm:card">
          <Header
            name={plan.name}
            onRename={handleRenamePlan}
            roomCount={roomCount}
            area={area}
            unit={unit}
            onUnitChange={setUnit}
            showDimensions={showDimensions}
            onShowDimensionsChange={setShowDimensions}
          />
          <div className="relative min-h-0 flex-1">
            <Canvas
              ref={canvasRef}
              rooms={rooms}
              openings={openings}
              furniture={furniture}
              actions={actions}
              tool={tool}
              onToolChange={handleToolChange}
              selection={selection}
              onSelect={setPicked}
              unit={unit}
              showDimensions={showDimensions}
            >
              <Toolbar tool={tool} onToolChange={handleToolChange} />
              {selection ? (
                <Inspector
                  selection={selection}
                  rooms={rooms}
                  openings={openings}
                  furniture={furniture}
                  actions={actions}
                  unit={unit}
                  onSelect={setPicked}
                />
              ) : null}
            </Canvas>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
