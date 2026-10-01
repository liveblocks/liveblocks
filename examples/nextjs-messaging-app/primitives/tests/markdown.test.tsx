import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  getYouTubeVideoIds,
  InlineMarkdown,
  Markdown,
} from "@/primitives/markdown";

describe("getYouTubeVideoIds", () => {
  it("extracts ids from common YouTube URL shapes and dedupes", () => {
    const id = "dQw4w9WgXcQ";
    const content = [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}`,
      `https://youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
    ].join(" ");
    expect(getYouTubeVideoIds(content)).toEqual([id]);
  });

  it("returns empty array for non-YouTube URLs", () => {
    expect(getYouTubeVideoIds("https://example.com/video")).toEqual([]);
  });
});

describe("Markdown", () => {
  it("renders inline formatting", () => {
    render(<Markdown content="**bold** and *em* and `code`" />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("em").tagName).toBe("EM");
    expect(screen.getByText("code").tagName).toBe("CODE");
  });

  it("renders strikethrough", () => {
    const { container } = render(<Markdown content="~~gone~~" />);
    const strike = container.querySelector(".line-through");
    expect(strike).toBeTruthy();
    expect(strike?.textContent).toBe("gone");
  });

  it("renders known and unknown mentions", () => {
    render(
      <Markdown content="Hi <@charlie.layne@example.com> and <@unknown.person@example.com>" />
    );
    expect(screen.getByText("@Charlie Layne")).toBeInTheDocument();
    expect(screen.getByText("@unknown.person@example.com")).toBeInTheDocument();
  });

  it("renders bare and www URLs", () => {
    render(
      <Markdown content="https://example.com/some/path and www.example.com" />
    );
    const pathLink = screen.getByRole("link", {
      name: "example.com/some/path",
    });
    expect(pathLink).toHaveAttribute("href", "https://example.com/some/path");
    expect(pathLink).toHaveAttribute("target", "_blank");
    expect(pathLink).toHaveAttribute("rel", "noreferrer noopener");

    const wwwLink = screen.getByRole("link", { name: "example.com" });
    expect(wwwLink).toHaveAttribute("href", "https://www.example.com");
  });

  it("renders markdown links", () => {
    render(<Markdown content="[label](https://example.com)" />);
    const link = screen.getByRole("link", { name: "label" });
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("renders code blocks and paragraphs", () => {
    const { container } = render(
      <Markdown content={"```\nconst x = 1;\n```\n\nSecond paragraph"} />
    );
    expect(container.querySelector("pre code")?.textContent).toBe(
      "const x = 1;"
    );
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(screen.getByText("Second paragraph")).toBeInTheDocument();
  });

  it("embeds at most two YouTube videos", () => {
    const { container } = render(
      <Markdown
        content={[
          "https://youtu.be/11111111111",
          "https://youtu.be/22222222222",
          "https://youtu.be/33333333333",
        ].join(" ")}
      />
    );
    const iframes = container.querySelectorAll("iframe");
    expect(iframes).toHaveLength(2);
    expect(iframes[0]?.getAttribute("src")).toContain(
      "youtube-nocookie.com/embed/11111111111"
    );
  });
});

describe("InlineMarkdown", () => {
  it("flattens paragraphs and shows first code line inline", () => {
    const { container } = render(
      <InlineMarkdown
        content={"Line one\nstill one\n\n```\nline1\nline2\n```"}
      />
    );
    expect(container.querySelector("br")).toBeNull();
    expect(screen.getByText(/Line one still one/)).toBeInTheDocument();
    expect(screen.getByText("line1").tagName).toBe("CODE");
  });

  it("renders mentions and bold inline", () => {
    render(<InlineMarkdown content="**hi** <@charlie.layne@example.com>" />);
    expect(screen.getByText("hi").tagName).toBe("STRONG");
    expect(screen.getByText("@Charlie Layne")).toBeInTheDocument();
  });
});
