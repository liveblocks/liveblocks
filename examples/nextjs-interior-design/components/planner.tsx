"use client";

import { useStorage, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlanActions } from "@/hooks/use-plan-actions";
import type { FurnitureType } from "@/lib/catalog";
import type { Selection, Tool } from "@/lib/plan";
import type { Plan, PlanId } from "@/lib/templates";
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
  onPlanChange,
}: {
  plan: Plan;
  onPlanChange: (planId: PlanId) => void;
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

  const handleResetPlan = useCallback(() => {
    setPicked(null);
    actions.resetPlan(plan.id);
  }, [actions, plan.id]);

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
          onPlanChange={onPlanChange}
          onResetPlan={handleResetPlan}
          onAddFurniture={handleAddFurniture}
          onDropFurniture={handleDropFurniture}
          getZoom={getZoom}
        />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface sm:card">
          <Header
            plan={plan}
            rooms={rooms}
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
