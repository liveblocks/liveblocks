import { forwardRef, type ComponentProps, type CSSProperties } from "react";
import type { TextStyleId } from "@/lib/project";
import { cn } from "@/lib/utils";

/**
 * Where each text style sits in the frame, and how it's drawn. Sizes are in
 * `cqmin` (a percentage of the frame's shorter side) so text keeps its
 * proportions in every aspect ratio and at every preview size.
 */
const ANCHORS: Record<
  TextStyleId,
  { position: CSSProperties; translate: string; origin: string }
> = {
  title: {
    position: { left: "50%", top: "50%" },
    translate: "translate(-50%, -50%)",
    origin: "center",
  },
  subtitle: {
    position: { left: "50%", top: "50%" },
    translate: "translate(-50%, -50%)",
    origin: "center",
  },
  "lower-third": {
    position: { left: "6%", bottom: "10%" },
    translate: "",
    origin: "left bottom",
  },
  caption: {
    position: { left: "50%", bottom: "8%" },
    translate: "translate(-50%, 0)",
    origin: "center bottom",
  },
};

const BOXES: Record<TextStyleId, CSSProperties> = {
  title: {
    fontSize: "12cqmin",
    lineHeight: 1.02,
    letterSpacing: "-0.01em",
    textAlign: "center",
    textShadow: "0 0.4cqmin 3cqmin rgb(0 0 0 / 0.35)",
  },
  subtitle: {
    fontSize: "3.6cqmin",
    letterSpacing: "0.32em",
    textTransform: "uppercase",
    fontWeight: 600,
    textAlign: "center",
    textShadow: "0 0.2cqmin 1.5cqmin rgb(0 0 0 / 0.4)",
  },
  "lower-third": {
    fontSize: "4.2cqmin",
    fontWeight: 600,
    lineHeight: 1.2,
    padding: "1.4cqmin 2.6cqmin 1.4cqmin 3cqmin",
    background: "rgb(12 12 16 / 0.55)",
    backdropFilter: "blur(8px)",
    borderRadius: "0.6cqmin",
    boxShadow: "inset 0.7cqmin 0 0 currentColor",
  },
  caption: {
    fontSize: "3.8cqmin",
    fontWeight: 500,
    lineHeight: 1.25,
    padding: "0.9cqmin 2cqmin",
    background: "rgb(0 0 0 / 0.62)",
    borderRadius: "1.2cqmin",
    textAlign: "center",
  },
};

export function textAnchor(textStyle: TextStyleId) {
  return ANCHORS[textStyle];
}

/**
 * A text clip, positioned in its frame (the nearest size container). The
 * preview adds offsets and animation through `transform`; the library uses
 * it as is for its style samples.
 */
export const TextPreview = forwardRef<
  HTMLDivElement,
  ComponentProps<"div"> & {
    textStyle: TextStyleId;
    text: string;
    fontClassName: string;
    color: string;
    transform?: string;
  }
>(function TextPreview(
  {
    textStyle,
    text,
    fontClassName,
    color,
    transform,
    className,
    style,
    children,
    ...props
  },
  ref
) {
  const anchor = ANCHORS[textStyle];
  const bold = textStyle === "title" && fontClassName === "font-sans";

  return (
    <div
      ref={ref}
      className={cn("absolute max-w-[86cqw] select-none", className)}
      style={{
        ...anchor.position,
        transform: transform ?? anchor.translate,
        transformOrigin: anchor.origin,
        ...style,
      }}
      {...props}
    >
      <div
        className={cn(
          "w-max max-w-[86cqw] text-balance whitespace-pre-wrap",
          fontClassName,
          bold && "font-bold tracking-tight"
        )}
        style={{ ...BOXES[textStyle], color }}
      >
        {text || " "}
      </div>
      {children}
    </div>
  );
});
