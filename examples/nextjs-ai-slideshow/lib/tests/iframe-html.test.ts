// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { patchIframeHtml } from "../iframe-html";

function mountIframe(html: string) {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(html);
  iframe.contentDocument!.close();
  return iframe;
}

describe("patchIframeHtml", () => {
  it("does nothing without an iframe", () => {
    expect(() => patchIframeHtml(null, "<p>x</p>")).not.toThrow();
  });

  it("falls back to srcdoc when the iframe has no document yet", () => {
    const iframe = { contentDocument: null, srcdoc: "" };
    patchIframeHtml(iframe as unknown as HTMLIFrameElement, "<p>hello</p>");
    expect(iframe.srcdoc).toBe("<p>hello</p>");
  });

  it("replaces the loaded document in place, copies root attributes, and dispatches a synthetic load instead of reloading", () => {
    const iframe = mountIframe(
      "<html lang='en'><body><p>old</p></body></html>"
    );
    const onLoad = vi.fn();
    iframe.addEventListener("load", onLoad);

    patchIframeHtml(
      iframe,
      "<html data-theme='dark'><body><h1>new</h1></body></html>"
    );

    const root = iframe.contentDocument!.documentElement;
    expect(iframe.contentDocument!.body.innerHTML).toBe("<h1>new</h1>");
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.hasAttribute("lang")).toBe(false);
    expect(iframe.srcdoc).toBe("");
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});
