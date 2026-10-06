// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SlideSidebar } from "@/app/slide-sidebar";

vi.mock("@/app/slides", () => ({
  useSlideHtml: () => "<html><body>thumb</body></html>",
}));

vi.mock("@/app/iframe-html", () => ({
  patchIframeHtml: vi.fn(),
}));

describe("SlideSidebar", () => {
  it("renders thumbnails wires add delete select and shows proposal marker", async () => {
    const user = userEvent.setup();
    const onAddSlide = vi.fn();
    const onDeleteSlide = vi.fn();
    const onSelectSlide = vi.fn();
    const onMoveSlide = vi.fn();

    const { container } = render(
      <SlideSidebar
        slideIds={["a", "b"]}
        displaySlides={[
          { id: "a", hasProposal: true },
          { id: "b", hasProposal: false },
        ]}
        selectedSlideId="a"
        onSelectSlide={onSelectSlide}
        onAddSlide={onAddSlide}
        onDeleteSlide={onDeleteSlide}
        onMoveSlide={onMoveSlide}
      />
    );

    const thumbnails = [
      screen.getByRole("button", { name: "Slide 1" }),
      screen.getByRole("button", { name: "Slide 2" }),
    ];

    await user.click(screen.getByRole("button", { name: "Add slide" }));
    expect(onAddSlide).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Delete slide 1" }));
    expect(onDeleteSlide).toHaveBeenCalledWith("a");

    await user.click(thumbnails[1]!);
    expect(onSelectSlide).toHaveBeenCalledWith("b");

    const proposalDots = container.querySelectorAll(
      "span.absolute.right-1\\.5.top-1\\.5.size-2\\.5.rounded-full.bg-primary"
    );
    expect(proposalDots.length).toBe(1);
  });
});
