"use client";

import {
  CalendarDaysIcon,
  CircleHelpIcon,
  PencilLineIcon,
  UsersIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
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

const EXAMPLE_NAME = "Social Media Calendar";
const EXAMPLE_URL =
  "https://liveblocks.io/examples/social-media-calendar/nextjs-social-media-calendar";

type Feature = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: <CalendarDaysIcon />,
    title: "Plan posts on a shared calendar",
    description:
      "Every post is stored in Liveblocks Storage. Switch between the monthly calendar and the list view, and use the + button on any day to plan a new post.",
  },
  {
    icon: <ZapIcon />,
    title: "Drag posts between days",
    description:
      "Drag a card to another day to reschedule it, or focus its handle and move it with the keyboard. Open this example in two tabs to watch the move appear instantly for everyone.",
  },
  {
    icon: <PencilLineIcon />,
    title: "Write posts together",
    description:
      "Click a post to open its composer: a Tiptap editor synced with LiveText, so several people can write the same caption at once, with live carets.",
  },
  {
    icon: <UsersIcon />,
    title: "See who's editing what",
    description:
      "Avatars in the header show who's in the project, and avatars on a card show who currently has that post open.",
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
                  variant="ghost"
                  size="icon-sm"
                  className="text-neutral-500"
                  aria-label="How to use this example"
                />
              }
            />
          }
        >
          <CircleHelpIcon />
        </TooltipTrigger>
        <TooltipContent>How to use this example</TooltipContent>
      </Tooltip>

      <DialogBackdrop />
      <DialogContent>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-950/5 p-5">
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
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-1 text-neutral-500"
                aria-label="Close"
              />
            }
          >
            <XIcon />
          </DialogClose>
        </div>

        <ul className="flex flex-col gap-4 overflow-y-auto p-5">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-start gap-4">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-700 [&_svg]:size-4">
                {feature.icon}
              </span>
              <div>
                <h3 className="text-sm font-medium text-neutral-900">
                  {feature.title}
                </h3>
                <p className="mt-0.5 text-sm text-neutral-500">
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
