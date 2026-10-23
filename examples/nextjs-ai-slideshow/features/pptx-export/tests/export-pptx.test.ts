// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import {
  getSlideText,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  SLIDES_ARRAY_KEY,
  STARTER_SLIDE_HTML,
} from "@/features/deck";
import { exportDeckToPptx } from "../export-pptx";

const toPng = vi.fn<
  (element: HTMLElement, options: Record<string, unknown>) => Promise<string>
>(async () => "data:image/png;base64,AAAA");
const addImage = vi.fn();
const addSlide = vi.fn(() => ({ addImage }));
const writeFile = vi.fn(async () => "slides.pptx");
const defineLayout = vi.fn();

vi.mock("html-to-image", () => ({
  toPng: (element: HTMLElement, options: Record<string, unknown>) =>
    toPng(element, options),
}));
vi.mock("pptxgenjs", () => ({
  default: class {
    layout = "";
    defineLayout = defineLayout;
    addSlide = addSlide;
    writeFile = writeFile;
  },
}));

function deckWith(slides: Array<[string, string]>) {
  const ydoc = new Y.Doc();
  ydoc.getArray<string>(SLIDES_ARRAY_KEY).push(slides.map(([id]) => id));
  for (const [id, html] of slides) {
    getSlideText(ydoc, id).insert(0, html);
  }
  return ydoc;
}

describe("exportDeckToPptx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0)
    );
  });

  it("refuses to export an empty deck", async () => {
    await expect(exportDeckToPptx(new Y.Doc())).rejects.toThrow(
      "No slides are ready to export yet."
    );
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("renders every slide to one 16:9 image and writes slides.pptx", async () => {
    const ydoc = deckWith([
      ["a", "<html><body><h1>One</h1></body></html>"],
      ["b", ""],
    ]);

    await exportDeckToPptx(ydoc);

    expect(defineLayout).toHaveBeenCalledWith({
      name: "LIVEBLOCKS_16_9",
      width: 10,
      height: 5.625,
    });
    expect(toPng).toHaveBeenCalledTimes(2);
    expect(toPng).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: SLIDE_WIDTH, height: SLIDE_HEIGHT })
    );
    expect(addSlide).toHaveBeenCalledTimes(2);
    expect(addImage).toHaveBeenCalledWith({
      data: "data:image/png;base64,AAAA",
      x: 0,
      y: 0,
      w: 10,
      h: 5.625,
    });
    expect(writeFile).toHaveBeenCalledWith({ fileName: "slides.pptx" });
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    expect(STARTER_SLIDE_HTML).toContain("<h1>");
  });
});
