"use client";

import {
  CircleHelpIcon,
  MessageSquareTextIcon,
  ScissorsIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { WithTooltip } from "./ui/tooltip";

const EXAMPLE_NAME = "Podcast Editor";
const EXAMPLE_URL =
  "https://liveblocks.io/examples/podcast-editor/nextjs-podcast-editor";

type Feature = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: <ScissorsIcon />,
    title: "Edit audio by editing text",
    description:
      "Select words in the transcript and press Delete to cut them from the episode; playback skips them seamlessly. Each cut is stored per word in Liveblocks Storage, so everyone's edits merge, and ⌘Z undoes only your own changes.",
  },
  {
    icon: <SparklesIcon />,
    title: "Clean up in one click",
    description:
      "Remove every “um” and “uh” at once, hide cut words to read the episode as it will sound, and export the edited audio as a WAV file, rendered in the browser.",
  },
  {
    icon: <UsersIcon />,
    title: "Listen together",
    description:
      "Everyone's playhead and selection are shared with Presence: see where each person is listening in the transcript and on the timeline. Open this example in two tabs to try it.",
  },
  {
    icon: <MessageSquareTextIcon />,
    title: "Comment on any moment",
    description:
      "Select words and choose Comment to start a thread anchored to them with Liveblocks Comments. Add chapters too: their timestamps follow the edit and turn into show notes.",
  },
];

export function HelpButton() {
  return (
    <Dialog>
      <WithTooltip label="How to use this example">
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-neutral-500"
            aria-label="How to use this example"
          >
            <CircleHelpIcon />
          </Button>
        </DialogTrigger>
      </WithTooltip>

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
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mt-1 -mr-1 text-neutral-500"
              aria-label="Close"
            >
              <XIcon />
            </Button>
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
