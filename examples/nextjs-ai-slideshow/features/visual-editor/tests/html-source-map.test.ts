// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  findElementSourceRange,
  getElementByPath,
  getElementPath,
} from "../html-source-map";

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; }
      .slide { display: grid; }
    </style>
  </head>
  <body>
    <header class="brand">Liveblocks</header>
    <main class="slide">
      <section class="hero">
        <h1>Build slides together</h1>
        <p><strong>Multiplayer</strong> AI editing.</p>
        <div class="actions"><button>Try it</button><a href="#">Learn more</a></div>
      </section>
      <section class="notes">
        <p>Speaker note</p>
      </section>
    </main>
    <footer>Page 1</footer>
  </body>
</html>`;

const hero = `<section class="hero">
        <h1>Build slides together</h1>
        <p><strong>Multiplayer</strong> AI editing.</p>
        <div class="actions"><button>Try it</button><a href="#">Learn more</a></div>
      </section>`;

function sliceRange(source: string, range: { start: number; end: number }) {
  return source.slice(range.start, range.end);
}

function syncUpdate(fromDoc: Y.Doc, toDoc: Y.Doc) {
  Y.applyUpdate(
    toDoc,
    Y.encodeStateAsUpdate(fromDoc, Y.encodeStateVector(toDoc))
  );
}

function anchorsFor(ytext: Y.Text, range: { start: number; end: number }) {
  return {
    start: Y.createRelativePositionFromTypeIndex(ytext, range.start, 0),
    end: Y.createRelativePositionFromTypeIndex(ytext, range.end, -1),
  };
}

function resolveAnchors(
  ydoc: Y.Doc,
  anchors: { start: Y.RelativePosition; end: Y.RelativePosition }
) {
  const start = Y.createAbsolutePositionFromRelativePosition(
    anchors.start,
    ydoc
  );
  const end = Y.createAbsolutePositionFromRelativePosition(anchors.end, ydoc);
  if (!start || !end) {
    throw new Error("anchor did not resolve");
  }
  return { start: start.index, end: end.index };
}

describe("findElementSourceRange", () => {
  it("maps a body child path to the exact source text of that element", () => {
    const range = findElementSourceRange(html, [0]);
    expect(range).not.toBeNull();
    expect(sliceRange(html, range!)).toBe(
      `<header class="brand">Liveblocks</header>`
    );
  });

  it("maps nested paths, including inline children and void-less leaves", () => {
    expect(sliceRange(html, findElementSourceRange(html, [1, 0])!)).toBe(hero);
    expect(sliceRange(html, findElementSourceRange(html, [1, 0, 1])!)).toBe(
      `<p><strong>Multiplayer</strong> AI editing.</p>`
    );
    expect(sliceRange(html, findElementSourceRange(html, [1, 0, 2, 0])!)).toBe(
      `<button>Try it</button>`
    );
    expect(sliceRange(html, findElementSourceRange(html, [2])!)).toBe(
      `<footer>Page 1</footer>`
    );
  });

  it("returns null for a path that points outside the document", () => {
    expect(findElementSourceRange(html, [9])).toBeNull();
  });
});

describe("getElementPath and getElementByPath", () => {
  it("round-trip an element through its body-relative child-index path", () => {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const root = parsed.body;
    const button = parsed.querySelector("button")!;
    const path = getElementPath(button, root);
    expect(path).toEqual([1, 0, 2, 0]);
    expect(getElementByPath(root, path!)).toBe(button);
  });

  it("return null when the element is not inside the root or the path is invalid", () => {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    expect(getElementPath(parsed.head, parsed.body)).toBeNull();
    expect(getElementByPath(parsed.body, [7, 7])).toBeNull();
  });
});

describe("source ranges survive concurrent Yjs edits via relative positions", () => {
  it("a remote insertion before the element shifts the anchored range, not its text", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const textA = docA.getText("slide:sample");
    textA.insert(0, html);
    syncUpdate(docA, docB);
    const textB = docB.getText("slide:sample");

    const heroRange = findElementSourceRange(textA.toString(), [1, 0])!;
    const anchors = anchorsFor(textA, heroRange);

    const remoteInsertion = `\n      <p data-remote="true">Remote CodeMirror edit</p>`;
    textB.insert(heroRange.start, remoteInsertion);
    syncUpdate(docB, docA);

    const shifted = resolveAnchors(docA, anchors);
    expect(sliceRange(textA.toString(), shifted)).toBe(hero);

    const replacement = hero.replace(
      "Build slides together",
      "Build slides visually"
    );
    docA.transact(() => {
      textA.delete(shifted.start, shifted.end - shifted.start);
      textA.insert(shifted.start, replacement);
    });

    const finalHtml = textA.toString();
    expect(finalHtml).toContain(remoteInsertion);
    expect(finalHtml).toContain(replacement);
    expect(finalHtml).not.toContain("<h1>Build slides together</h1>");
  });

  it("re-anchoring after each streamed replacement keeps exactly one copy of the element", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const textA = docA.getText("slide:sample");
    textA.insert(0, html);
    syncUpdate(docA, docB);
    const textB = docB.getText("slide:sample");

    const range = findElementSourceRange(textA.toString(), [1, 0])!;
    let anchors = anchorsFor(textA, range);

    const replaceAndReanchor = (replacement: string) => {
      const current = resolveAnchors(docA, anchors);
      docA.transact(() => {
        textA.delete(current.start, current.end - current.start);
        textA.insert(current.start, replacement);
      });
      anchors = anchorsFor(textA, {
        start: current.start,
        end: current.start + replacement.length,
      });
    };

    const step = (px: number) =>
      hero.replace(
        `<section class="hero">`,
        `<section class="hero" style="transform: translate(${px}px, ${px / 2}px);">`
      );

    replaceAndReanchor(step(10));
    syncUpdate(docA, docB);

    const remote = `\n    <aside data-remote="true">Remote edit during drag</aside>`;
    textB.insert(range.start, remote);
    syncUpdate(docB, docA);

    replaceAndReanchor(step(20));
    replaceAndReanchor(step(30));

    const result = textA.toString();
    expect(result).toContain(remote);
    expect(result.split(step(30)).length - 1).toBe(1);
    expect(result).not.toContain(step(10));
    expect(result).not.toContain(step(20));
  });

  it("a remote deletion of the element collapses the anchored range", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const textA = docA.getText("slide:sample");
    textA.insert(0, html);
    syncUpdate(docA, docB);
    const textB = docB.getText("slide:sample");

    const range = findElementSourceRange(textA.toString(), [1, 0])!;
    const anchors = anchorsFor(textA, range);

    textB.delete(range.start, range.end - range.start);
    syncUpdate(docB, docA);

    const collapsed = resolveAnchors(docA, anchors);
    expect(collapsed.end).toBeLessThanOrEqual(collapsed.start);
  });
});
