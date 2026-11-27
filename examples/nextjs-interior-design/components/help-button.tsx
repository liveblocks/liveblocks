"use client";

import { CircleHelpIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const EXAMPLE_NAME = "Collaborative interior design";
const EXAMPLE_URL =
  "https://liveblocks.io/examples/interior-design/nextjs-interior-design";

type Feature = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: <FloorPlanIcon />,
    title: "Draw the floor plan",
    description:
      "Pick the Room tool and drag to draw a room. Drag walls and corners to reshape it, and use the + handles to add corners.",
  },
  {
    icon: <DoorIcon />,
    title: "Add doors, windows, and furniture",
    description:
      "Use the Door and Window tools to place openings on any wall, then drag furniture from the library onto the plan. Furniture snaps flush against walls.",
  },
  {
    icon: <UsersIcon />,
    title: "Design together",
    description:
      "Open this example in two tabs: every change syncs instantly through Liveblocks Storage, with live cursors and selections from Presence.",
  },
  {
    icon: <UndoIcon />,
    title: "Multiplayer undo and redo",
    description:
      "Each person undoes only their own changes. A whole drag counts as a single step, so nothing is lost when you work at the same time.",
  },
];

export function HelpButton() {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  aria-label="How to use this example"
                  className="text-ink-muted"
                />
              }
            />
          }
        >
          <CircleHelpIcon />
        </TooltipTrigger>
        <TooltipContent side="top">How to use this example</TooltipContent>
      </Tooltip>

      <DialogBackdrop />
      <DialogContent>
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <DialogTitle>
              <a
                href={EXAMPLE_URL}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {EXAMPLE_NAME}
              </a>
            </DialogTitle>
            <DialogDescription>How to use this example</DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                size="icon"
                aria-label="Close"
                className="-mt-1 -mr-1 text-ink-muted"
              />
            }
          >
            <XIcon />
          </DialogClose>
        </div>

        <ul className="flex flex-col gap-4 overflow-y-auto p-5">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-start gap-4">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded bg-hover text-ink-secondary [&_svg]:size-4">
                {feature.icon}
              </span>
              <div>
                <h3 className="text-sm font-medium text-ink">
                  {feature.title}
                </h3>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function FeatureIconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function FloorPlanIcon() {
  return (
    <FeatureIconBase>
      <path d="M3 3h18v18H3z" />
      <path d="M12 3v7M12 14v7M12 10H3" />
    </FeatureIconBase>
  );
}

function DoorIcon() {
  return (
    <FeatureIconBase>
      <path d="M4 20V4M4 4h12" />
      <path d="M16 4a12 12 0 01-12 12" strokeDasharray="2 3" />
      <path d="M4 20h16" />
    </FeatureIconBase>
  );
}

function UsersIcon() {
  return (
    <FeatureIconBase>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx={9} cy={7} r={4} />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </FeatureIconBase>
  );
}

function UndoIcon() {
  return (
    <FeatureIconBase>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
    </FeatureIconBase>
  );
}
