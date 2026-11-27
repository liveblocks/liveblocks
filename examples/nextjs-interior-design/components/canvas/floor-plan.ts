import {
  createChange,
  createViewport,
  definePrimitive,
  type CanvasRect,
  type ChangeDetails,
  type Viewport,
  type ViewportReason,
} from "@ui-sdk/core";

// Zoom is in pixels per centimeter.
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

// `fit` zooms in no further than this, and leaves room for the toolbar
// floating over the bottom of the plan.
const FIT_MAX_ZOOM = 1.5;
const FIT_RESERVED_BOTTOM = 44;

// Where the plan sits when there's nothing on it to frame.
const EMPTY_ZOOM = 0.8;

type FloorPlanState = { viewport: Viewport };

export type FloorPlanOptions = {
  // Where the plan sits on screen and how far it's zoomed in. Pass
  // `viewport` to hold it yourself, or leave it to the primitive and listen
  // to `onViewportChange`.
  viewport?: Viewport;
  defaultViewport?: Viewport;
  onViewportChange?: (
    viewport: Viewport,
    details: ChangeDetails<ViewportReason>
  ) => void;
  // The box around everything drawn on the plan, in centimeters, or `null`
  // for an empty plan. It's what `fit` frames.
  content?: CanvasRect | null;
};

/**
 * The surface a floor plan is drawn on, as a ui-sdk primitive: it turns
 * scrolling, pinching and dragging into pans and zooms.
 *
 * All of that comes from ui-sdk's `createViewport`: the wheel and trackpad
 * (scroll to pan, pinch or Ctrl/⌘ + scroll to zoom at the pointer), one
 * pointer dragging and two pinching on a touch screen, the + and − keys,
 * and the conversions between the screen and the plan. What's added here
 * is `fit`, which knows about the plan's toolbar.
 *
 * It's rendered with `usePrimitive` and `usePart` in `canvas.tsx`.
 */
export const floorPlan = definePrimitive({
  name: "floor-plan",
  options: {
    viewport: "value",
    defaultViewport: "value",
    onViewportChange: "callback",
    content: "value",
  },
  controlled: ["viewport"],
  state: (options: FloorPlanOptions): FloorPlanState => ({
    viewport: options.viewport ??
      options.defaultViewport ?? { x: 0, y: 0, zoom: EMPTY_ZOOM },
  }),
  sync: (options) => (options.viewport ? { viewport: options.viewport } : {}),
  // The viewport changes on every frame of a pan: nothing in the primitive
  // renders for it.
  live: ["viewport"],
  api: (context) => {
    const change = createChange(context);
    const viewport = createViewport<FloorPlanState>(context, {
      key: "viewport",
      surface: () => context.element("root"),
      // Goes through the primitive's change, so that `onViewportChange`
      // hears about every pan and zoom, with what caused it.
      set: (value, details) => change("viewport", value, details),
      minZoom: () => MIN_ZOOM,
      maxZoom: () => MAX_ZOOM,
    });

    return {
      viewport,
      zoomIn: () => viewport.zoomBy(1.25),
      zoomOut: () => viewport.zoomBy(0.8),
      /** Frames everything on the plan, clear of the toolbar. */
      fit() {
        const surface = context.element("root");
        const width = surface?.clientWidth ?? 0;
        const height = surface?.clientHeight ?? 0;
        if (!width || !height) {
          return false;
        }
        const { content } = context.options();
        if (!content) {
          return viewport.setViewport({
            x: width / 2,
            y: height / 2,
            zoom: EMPTY_ZOOM,
          });
        }
        const padding = Math.min(88, width * 0.1);
        const available = height - FIT_RESERVED_BOTTOM;
        const zoom = Math.min(
          Math.max(
            Math.min(
              (width - padding * 2) / Math.max(1, content.right - content.left),
              (available - padding * 2) /
                Math.max(1, content.bottom - content.top)
            ),
            MIN_ZOOM
          ),
          FIT_MAX_ZOOM
        );
        return viewport.setViewport({
          zoom,
          x: width / 2 - ((content.left + content.right) / 2) * zoom,
          y: available / 2 - ((content.top + content.bottom) / 2) * zoom,
        });
      },
    };
  },
  slots: (slot) => ({
    root: slot({
      role: "group",
      on: {
        wheel: (event, { api }) => api.viewport.wheel(event),
      },
    }),
  }),
  // What an agent connected through ui-sdk's bridge may do with the view.
  agent: { actions: ["zoomIn", "zoomOut", "fit"] },
});
