"use client";

import {
  CircleHelpIcon,
  EraserIcon,
  MousePointer2Icon,
  PencilIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EXAMPLE_NAME = "Drawesome x Liveblocks";
const EXAMPLE_URL =
  "https://liveblocks.io/examples/drawesome/nextjs-drawesome";
const DRAWESOME_URL = "https://benji.org/drawesome";
const AUTHOR_NAME = "Benji Taylor";
const AUTHOR_URL = "https://benji.org";

const FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: PencilIcon,
    title: "Draw together",
    description:
      "Sketch with Drawesome’s pens and eraser. In-progress strokes stream live through Presence; finished strokes sync via Storage.",
  },
  {
    icon: UsersIcon,
    title: "Open in two tabs",
    description:
      "Open this example twice to see strokes appear while the other person is still drawing.",
  },
  {
    icon: MousePointer2Icon,
    title: "Live cursors",
    description:
      "Watch other people’s cursors move on the canvas, and see who’s here in the avatar stack.",
  },
  {
    icon: EraserIcon,
    title: "Shared erase and clear",
    description:
      "Area erase and clear are shared. Your undo only removes strokes you added; everyone else’s ink stays put.",
  },
];

export function HelpButton() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="How to use this example"
            className="text-muted-foreground"
          />
        }
      >
        <CircleHelpIcon />
      </DialogTrigger>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4 pb-0">
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
          <DialogDescription className="sr-only">How to use this example</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-4 p-4">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-start gap-4">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <feature.icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground text-balance">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="rounded-b-xl border-t bg-muted px-4 py-3 text-xs text-muted-foreground">
          <a
            href={DRAWESOME_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-3 decoration-foreground/10 hover:text-foreground transition"
          >
            Drawesome
          </a>{" "}
          by{" "}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-3 decoration-foreground/10 hover:text-foreground transition"
          >
            {AUTHOR_NAME}
          </a>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
