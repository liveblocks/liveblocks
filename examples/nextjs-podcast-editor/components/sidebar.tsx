"use client";

import { useSelf } from "@liveblocks/react/suspense";
import { RotateCcwIcon, SparklesIcon } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { formatDuration, formatTime } from "@/lib/format";
import {
  EPISODE_NUMBER,
  FILLER_WORDS,
  ORIGINAL_DURATION,
  PARAGRAPHS,
  SHOW_NAME,
  SPEAKERS,
  spanEnd,
  spanStart,
} from "@/lib/transcript";
import { Brand, CoverArt } from "./brand";
import { useEditor } from "./editor-context";
import { HelpButton } from "./help-button";
import { SpeakerAvatar } from "./speaker-avatar";
import { SpeakerName } from "./speaker-name";
import { Button } from "./ui/button";

/** The episode, what the edit has done to it, cleanup tools, and speakers. */
export function Sidebar() {
  const self = useSelf();
  const {
    timeline,
    cuts,
    speakerName,
    cutFillers,
    restoreAll,
    setPreviewFillers,
  } = useEditor();

  const remainingFillers = FILLER_WORDS.filter(
    (word) => !cuts.has(word.index)
  ).length;
  const removed = ORIGINAL_DURATION - timeline.duration;

  // How long each speaker talks in the edited episode.
  const talkTime = useMemo(() => {
    const result = new Map<string, number>();
    for (const paragraph of PARAGRAPHS) {
      for (const word of paragraph.words) {
        if (!cuts.has(word.index)) {
          result.set(
            paragraph.speakerId,
            (result.get(paragraph.speakerId) ?? 0) +
              spanEnd(word.index) -
              spanStart(word.index)
          );
        }
      }
    }
    return result;
  }, [cuts]);

  return (
    <aside className="scroll-quiet hidden w-60 shrink-0 flex-col gap-6 overflow-y-auto px-4 pt-3 pb-3 xl:flex">
      <Brand />

      <div className="flex items-center gap-3">
        <CoverArt />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {SHOW_NAME}
          </p>
          <p className="text-xs text-neutral-500">Episode {EPISODE_NUMBER}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Draft
          </span>
        </div>
      </div>

      <Section title="Edit">
        <dl className="grid grid-cols-2 gap-2">
          <Stat label="Original" value={formatTime(ORIGINAL_DURATION)} />
          <Stat
            label="Edited"
            value={formatTime(timeline.duration)}
            detail={removed > 0.05 ? `−${formatDuration(removed)}` : undefined}
          />
        </dl>
        <div className="mt-3 flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={cutFillers}
            onMouseEnter={() => setPreviewFillers(true)}
            onMouseLeave={() => setPreviewFillers(false)}
            onFocus={() => setPreviewFillers(true)}
            onBlur={() => setPreviewFillers(false)}
            disabled={remainingFillers === 0}
          >
            <SparklesIcon className="text-primary" />
            <span className="flex-1 text-left">
              {remainingFillers > 0
                ? "Remove filler words"
                : "No filler words left"}
            </span>
            {remainingFillers > 0 ? (
              <span className="rounded-full bg-rose-50 px-1.5 text-[11px] font-semibold text-rose-600 tabular-nums">
                {remainingFillers}
              </span>
            ) : null}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-neutral-500"
            onClick={restoreAll}
            disabled={cuts.size === 0}
          >
            <RotateCcwIcon />
            Restore all cuts
            {cuts.size > 0 ? (
              <span className="ml-auto text-[11px] text-neutral-400 tabular-nums">
                {cuts.size} word{cuts.size === 1 ? "" : "s"}
              </span>
            ) : null}
          </Button>
        </div>
      </Section>

      <Section title="Speakers">
        <ul className="flex flex-col gap-3">
          {SPEAKERS.map((speaker) => {
            const time = talkTime.get(speaker.id) ?? 0;
            const share = timeline.duration > 0 ? time / timeline.duration : 0;
            return (
              <li key={speaker.id} className="flex items-center gap-2.5">
                <SpeakerAvatar
                  name={speakerName(speaker.id)}
                  color={speaker.color}
                  className="size-7"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <SpeakerName
                      speakerId={speaker.id}
                      className="cursor-pointer truncate rounded-sm text-[13px] font-medium text-neutral-900 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="shrink-0 text-[11px] text-neutral-500 tabular-nums">
                      {formatTime(time)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200/70">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${share * 100}%`,
                        backgroundColor: speaker.color,
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="mt-auto flex items-center gap-2.5 border-t border-neutral-950/7 pt-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={self.info.avatar}
          alt=""
          className="size-7 rounded-full bg-neutral-200"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-neutral-900">
            {self.info.name}
          </p>
          <p className="text-[11px] text-neutral-500">Editor</p>
        </div>
        <HelpButton />
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-xs ring-1 ring-neutral-950/5">
      <dt className="text-[11px] text-neutral-500">{label}</dt>
      <dd className="flex items-baseline gap-1.5 text-sm font-semibold text-neutral-900 tabular-nums">
        {value}
        {detail ? (
          <span className="text-[11px] font-medium text-rose-500">
            {detail}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
