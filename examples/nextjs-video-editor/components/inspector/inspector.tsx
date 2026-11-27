"use client";

import { shallow } from "@liveblocks/client";
import { useHistory, useOthersMapped } from "@liveblocks/react/suspense";
import {
  AudioLinesIcon,
  CopyIcon,
  MousePointerClickIcon,
  ScissorsIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/collaborators";
import { FilmstripFrame } from "@/components/filmstrip-frame";
import {
  Options,
  percent,
  PropertySlider,
  Section,
  seconds,
  Swatches,
} from "@/components/inspector/controls";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Waveform } from "@/components/waveform";
import {
  useClip,
  useClips,
  useEditorActions,
  useProject,
  useSelection,
  useTracks,
} from "@/hooks/use-editor";
import { usePlayback, usePlaybackTime } from "@/hooks/use-playback";
import { frameIndexAt, getAsset } from "@/lib/media";
import {
  ASPECTS,
  BACKGROUNDS,
  FONTS,
  LOOKS,
  MIN_CLIP_DURATION,
  TEXT_COLORS,
  TEXT_MOTIONS,
  TEXT_STYLES,
  VIDEO_MOTIONS,
  type Clip,
  type ClipLson,
} from "@/lib/project";
import {
  clipEnd,
  formatDuration,
  formatTimecode,
  projectDuration,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

export function Inspector() {
  const [selection] = useSelection();
  const clip = useClip(selection.length === 1 ? selection[0] : undefined);

  if (selection.length > 1) {
    return <MultiInspector clipIds={selection} />;
  }
  if (clip) {
    return <ClipInspector key={clip.id} clip={clip} />;
  }
  return <ProjectInspector />;
}

function ScrollArea({ children }: { children: React.ReactNode }) {
  return (
    <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
      {children}
    </div>
  );
}

function ProjectInspector() {
  const project = useProject();
  const clips = useClips();
  const tracks = useTracks();
  const { updateProject } = useEditorActions();

  return (
    <ScrollArea>
      <Section title="Format">
        <div
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="Aspect ratio"
        >
          {ASPECTS.map((aspect) => {
            const selected = aspect.id === project.aspect;
            return (
              <button
                key={aspect.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => updateProject({ aspect: aspect.id })}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-lg px-2 pt-3 pb-2 ring-1 ring-neutral-950/8 transition outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-ring",
                  selected &&
                    "bg-brand-soft ring-2 ring-brand hover:bg-brand-soft"
                )}
              >
                <span className="flex h-8 items-center">
                  <span
                    className={cn(
                      "block rounded-[3px] border-[1.5px]",
                      selected
                        ? "border-brand bg-brand/10"
                        : "border-neutral-400"
                    )}
                    style={{
                      width: aspect.ratio >= 1 ? 30 : 30 * aspect.ratio,
                      height: aspect.ratio >= 1 ? 30 / aspect.ratio : 30,
                    }}
                  />
                </span>
                <span className="text-[11px] leading-tight font-medium text-neutral-700">
                  {aspect.label}
                  <span className="block text-neutral-400 tabular">
                    {aspect.id}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Background">
        <Swatches
          label="Background color"
          value={project.background}
          colors={BACKGROUNDS}
          onChange={(background) => updateProject({ background })}
        />
      </Section>
      <Section title="Overview">
        <dl className="grid grid-cols-3 gap-2">
          {[
            ["Duration", formatTimecode(projectDuration(clips))],
            ["Clips", String(clips.length)],
            ["Tracks", String(tracks.length)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg bg-neutral-50 px-2.5 py-2 ring-1 ring-neutral-950/5"
            >
              <dt className="text-[11px] text-neutral-500">{label}</dt>
              <dd className="mt-0.5 text-[13px] font-semibold text-neutral-900 tabular">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <div className="flex flex-col items-center gap-2 px-6 pt-6 pb-8 text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <MousePointerClickIcon className="size-4" />
        </span>
        <p className="text-xs leading-relaxed text-neutral-500">
          Select a clip on the timeline or in the preview to edit its look,
          motion, text and sound.
        </p>
      </div>
    </ScrollArea>
  );
}

function MultiInspector({ clipIds }: { clipIds: readonly string[] }) {
  const { deleteClips, duplicateClips, setSelection } = useEditorActions();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[13px] font-medium text-neutral-700">
        {clipIds.length} clips selected
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelection(duplicateClips([...clipIds]))}
        >
          <CopyIcon /> Duplicate
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => {
            deleteClips([...clipIds]);
            setSelection([]);
          }}
        >
          <Trash2Icon /> Delete
        </Button>
      </div>
    </div>
  );
}

function ClipInspector({ clip }: { clip: Clip }) {
  const { updateClip } = useEditorActions();
  const update = (patch: Partial<ClipLson>) => updateClip(clip.id, patch);
  const maxFade = Math.max(0.1, Math.min(3, clip.duration / 2));

  return (
    <>
      <ClipHeader clip={clip} />
      <ScrollArea>
        {clip.type === "text" ? (
          <TextSections clip={clip} update={update} />
        ) : null}
        {clip.type === "video" ? (
          <VideoSections clip={clip} update={update} />
        ) : null}

        {clip.type !== "audio" ? (
          <Section
            title="Transform"
            onReset={
              clip.x !== 0 ||
              clip.y !== 0 ||
              clip.scale !== 1 ||
              clip.opacity !== 1
                ? () => update({ x: 0, y: 0, scale: 1, opacity: 1 })
                : undefined
            }
          >
            <PropertySlider
              label="Scale"
              value={clip.scale}
              min={0.25}
              max={2}
              step={0.01}
              format={percent}
              onChange={(scale) => update({ scale })}
            />
            <PropertySlider
              label="Position X"
              value={clip.x}
              min={-0.5}
              max={0.5}
              step={0.005}
              format={percent}
              onChange={(x) => update({ x })}
            />
            <PropertySlider
              label="Position Y"
              value={clip.y}
              min={-0.5}
              max={0.5}
              step={0.005}
              format={percent}
              onChange={(y) => update({ y })}
            />
            <PropertySlider
              label="Opacity"
              value={clip.opacity}
              min={0}
              max={1}
              step={0.01}
              format={percent}
              onChange={(opacity) => update({ opacity })}
            />
          </Section>
        ) : (
          <Section title="Sound">
            <AudioPreview clip={clip} />
            <PropertySlider
              label="Volume"
              value={clip.volume}
              min={0}
              max={1}
              step={0.01}
              format={percent}
              onChange={(volume) => update({ volume })}
            />
          </Section>
        )}

        <Section title="Fades">
          <PropertySlider
            label="Fade in"
            value={clip.fadeIn}
            min={0}
            max={maxFade}
            step={0.1}
            format={seconds}
            onChange={(fadeIn) => update({ fadeIn })}
          />
          <PropertySlider
            label="Fade out"
            value={clip.fadeOut}
            min={0}
            max={maxFade}
            step={0.1}
            format={seconds}
            onChange={(fadeOut) => update({ fadeOut })}
          />
        </Section>

        <Section title="Timing">
          <dl className="grid grid-cols-3 gap-2">
            {[
              ["Start", formatTimecode(clip.start)],
              ["End", formatTimecode(clipEnd(clip))],
              ["Length", formatDuration(clip.duration)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg bg-neutral-50 px-2.5 py-2 ring-1 ring-neutral-950/5"
              >
                <dt className="text-[11px] text-neutral-500">{label}</dt>
                <dd className="mt-0.5 text-xs font-semibold text-neutral-900 tabular">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      </ScrollArea>
      <ClipActions clip={clip} />
    </>
  );
}

function clipName(clip: Clip) {
  if (clip.type === "text") return clip.text.split("\n")[0] || "Text";
  return getAsset(clip.assetId)?.name ?? "Clip";
}

const TYPE_LABELS = { video: "Video", text: "Text", audio: "Audio" } as const;

function ClipHeader({ clip }: { clip: Clip }) {
  const asset = getAsset(clip.assetId);
  const editors = useOthersMapped(
    (other) =>
      other.presence.selectedClipIds.includes(clip.id)
        ? {
            name: other.info.name,
            avatar: other.info.avatar,
            color: other.info.color,
          }
        : null,
    shallow
  ).flatMap(([connectionId, other]) =>
    other ? [{ connectionId, ...other }] : []
  );

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-neutral-950/6 px-4 pt-1 pb-3">
      <div className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-neutral-950/8">
        {asset?.kind === "video" ? (
          <FilmstripFrame
            asset={asset}
            index={frameIndexAt(asset, clip.offset + 0.5)}
            className="absolute inset-0"
            style={{
              filter: LOOKS.find((look) => look.id === clip.look)?.filter,
            }}
          />
        ) : clip.type === "text" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-title-clip text-white">
            <TypeIcon className="size-4" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-sound-clip text-white">
            <AudioLinesIcon className="size-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-neutral-900">
          {clipName(clip)}
        </p>
        <p className="text-xs text-neutral-500 tabular">
          {TYPE_LABELS[clip.type]} · {formatDuration(clip.duration)}
        </p>
      </div>
      {editors.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex -space-x-1.5">
              {editors.slice(0, 3).map((editor) => (
                <Avatar
                  key={editor.connectionId}
                  size={22}
                  src={editor.avatar}
                  name={editor.name}
                  color={editor.color}
                />
              ))}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            {editors.map((editor) => editor.name).join(", ")} also selected this
            clip
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

function ClipActions({ clip }: { clip: Clip }) {
  const time = usePlaybackTime();
  const playback = usePlayback();
  const { splitClips, duplicateClips, deleteClips, setSelection } =
    useEditorActions();
  const canSplit =
    time > clip.start + MIN_CLIP_DURATION &&
    time < clipEnd(clip) - MIN_CLIP_DURATION;

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-t border-neutral-950/6 px-3 py-2.5">
      <ActionButton
        label="Split at playhead"
        shortcut="S"
        disabled={!canSplit}
        onClick={() => splitClips([clip.id], playback.time)}
      >
        <ScissorsIcon /> Split
      </ActionButton>
      <ActionButton
        label="Duplicate"
        shortcut="⌘D"
        onClick={() => setSelection(duplicateClips([clip.id]))}
      >
        <CopyIcon /> Duplicate
      </ActionButton>
      <ActionButton
        label="Delete"
        shortcut="⌫"
        className="ml-auto text-neutral-500 hover:text-destructive"
        onClick={() => {
          deleteClips([clip.id]);
          setSelection([]);
        }}
      >
        <Trash2Icon />
      </ActionButton>
    </div>
  );
}

function ActionButton({
  label,
  shortcut,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; shortcut: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={label}
          className={cn("h-7 gap-1.5 px-2 text-xs [&_svg]:size-3.5", className)}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent>
        {label}
        <Kbd>{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function VideoSections({
  clip,
  update,
}: {
  clip: Clip;
  update: (patch: Partial<ClipLson>) => void;
}) {
  const asset = getAsset(clip.assetId);
  if (!asset || asset.kind !== "video") return null;
  const frame = frameIndexAt(asset, clip.offset + clip.duration / 2);

  return (
    <>
      <Section title="Look">
        <div
          className="grid grid-cols-4 gap-x-2 gap-y-2.5"
          role="radiogroup"
          aria-label="Look"
        >
          {LOOKS.map((look) => {
            const selected = look.id === clip.look;
            return (
              <button
                key={look.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ look: look.id })}
                className="group flex cursor-pointer flex-col items-center gap-1 outline-none"
              >
                <span
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-md ring-1 ring-neutral-950/8 transition outline-2 outline-offset-2 outline-transparent group-focus-visible:outline-ring",
                    selected &&
                      "outline-brand group-focus-visible:outline-brand"
                  )}
                >
                  <FilmstripFrame
                    asset={asset}
                    index={frame}
                    className="absolute inset-y-0 left-1/2 aspect-video -translate-x-1/2"
                    style={{ filter: look.filter }}
                  />
                </span>
                <span
                  className={cn(
                    "text-[11px] text-neutral-500",
                    selected && "font-medium text-neutral-900"
                  )}
                >
                  {look.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Motion">
        <Options
          label="Motion"
          value={clip.motion}
          options={VIDEO_MOTIONS}
          onChange={(motion) => update({ motion })}
        />
      </Section>
    </>
  );
}

function TextSections({
  clip,
  update,
}: {
  clip: Clip;
  update: (patch: Partial<ClipLson>) => void;
}) {
  const history = useHistory();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <>
      <Section title="Text">
        <textarea
          id="text-clip-content"
          aria-label="Text"
          value={draft ?? clip.text}
          rows={2}
          onFocus={() => {
            setDraft(clip.text);
            history.pause();
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            update({ text: event.target.value });
          }}
          onBlur={() => {
            setDraft(null);
            history.resume();
          }}
          className="w-full resize-none rounded-lg bg-white px-3 py-2 text-[13px] leading-snug text-neutral-900 shadow-xs ring-1 ring-neutral-950/10 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-ring"
          placeholder="Type something…"
        />
        <div
          className="grid grid-cols-2 gap-1.5"
          role="radiogroup"
          aria-label="Style"
        >
          {TEXT_STYLES.map((style) => {
            const selected = style.id === clip.textStyle;
            return (
              <button
                key={style.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ textStyle: style.id })}
                className={cn(
                  "h-8 cursor-pointer rounded-md text-xs font-medium text-neutral-600 ring-1 ring-neutral-950/8 transition outline-none hover:bg-neutral-50 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring",
                  selected &&
                    "bg-brand-soft text-neutral-900 ring-2 ring-brand hover:bg-brand-soft"
                )}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Font">
        <Options
          label="Font"
          value={clip.font}
          options={FONTS}
          onChange={(font) => update({ font })}
          renderOption={(option) => (
            <span
              className={cn(
                FONTS.find((font) => font.id === option.id)?.className,
                option.id === "serif" && "text-[15px]",
                option.id === "display" && "tracking-wide"
              )}
            >
              {option.label}
            </span>
          )}
        />
        <Swatches
          label="Text color"
          value={clip.color}
          colors={TEXT_COLORS}
          onChange={(color) => update({ color })}
        />
      </Section>
      <Section title="Animation">
        <Options
          label="Animation"
          value={clip.motion}
          options={TEXT_MOTIONS}
          onChange={(motion) => update({ motion })}
        />
      </Section>
    </>
  );
}

function AudioPreview({ clip }: { clip: Clip }) {
  const asset = getAsset(clip.assetId);
  if (!asset || asset.kind !== "audio") return null;
  return (
    <Waveform
      peaks={asset.peaks}
      from={clip.offset}
      to={clip.offset + clip.duration}
      className="h-8 w-full text-sound-clip"
    />
  );
}
