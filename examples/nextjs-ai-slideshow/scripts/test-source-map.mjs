import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import * as Y from "yjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const sourcePath = join(projectRoot, "app/html-source-map.ts");
const compiledPath = join(__dirname, ".tmp-html-source-map.mjs");

async function importSourceMapModule() {
  const source = await readFile(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  });

  await writeFile(compiledPath, compiled.outputText);
  return import(`${pathToFileURL(compiledPath).href}?t=${Date.now()}`);
}

function assertRange(html, range, expected) {
  assert.ok(range, "Expected source range to be found");
  assert.equal(html.slice(range.start, range.end), expected);
}

function resolveRange(ydoc, ytext, startAnchor, endAnchor) {
  const start = Y.createAbsolutePositionFromRelativePosition(startAnchor, ydoc);
  const end = Y.createAbsolutePositionFromRelativePosition(endAnchor, ydoc);
  assert.ok(start, "Expected start anchor to resolve");
  assert.ok(end, "Expected end anchor to resolve");
  assert.equal(start.type, ytext);
  assert.equal(end.type, ytext);
  return { start: start.index, end: end.index };
}

function syncUpdate(fromDoc, toDoc) {
  Y.applyUpdate(toDoc, Y.encodeStateAsUpdate(fromDoc, Y.encodeStateVector(toDoc)));
}

function replaceAndReanchor(ydoc, ytext, startAnchor, endAnchor, replacement) {
  const range = resolveRange(ydoc, ytext, startAnchor, endAnchor);
  ydoc.transact(() => {
    ytext.delete(range.start, range.end - range.start);
    ytext.insert(range.start, replacement);
  });

  return {
    startAnchor: Y.createRelativePositionFromTypeIndex(ytext, range.start, 0),
    endAnchor: Y.createRelativePositionFromTypeIndex(
      ytext,
      range.start + replacement.length,
      -1
    ),
  };
}

try {
  const { findElementSourceRange } = await importSourceMapModule();

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

  const header = `<header class="brand">Liveblocks</header>`;
  const hero = `<section class="hero">
        <h1>Build slides together</h1>
        <p><strong>Multiplayer</strong> AI editing.</p>
        <div class="actions"><button>Try it</button><a href="#">Learn more</a></div>
      </section>`;
  const paragraph = `<p><strong>Multiplayer</strong> AI editing.</p>`;
  const button = `<button>Try it</button>`;
  const footer = `<footer>Page 1</footer>`;

  assertRange(html, findElementSourceRange(html, [0]), header);
  assertRange(html, findElementSourceRange(html, [1, 0]), hero);
  assertRange(html, findElementSourceRange(html, [1, 0, 1]), paragraph);
  assertRange(html, findElementSourceRange(html, [1, 0, 2, 0]), button);
  assertRange(html, findElementSourceRange(html, [2]), footer);
  assert.equal(findElementSourceRange(html, [9]), null);

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const textA = docA.getText("slide:sample");
  textA.insert(0, html);
  syncUpdate(docA, docB);

  const textB = docB.getText("slide:sample");
  const heroRange = findElementSourceRange(textA.toString(), [1, 0]);
  assert.ok(heroRange, "Expected hero source range");

  const startAnchor = Y.createRelativePositionFromTypeIndex(
    textA,
    heroRange.start,
    0
  );
  const endAnchor = Y.createRelativePositionFromTypeIndex(
    textA,
    heroRange.end,
    -1
  );

  const remoteInsertion = `\n      <p data-remote="true">Remote CodeMirror edit</p>`;
  textB.insert(heroRange.start, remoteInsertion);
  syncUpdate(docB, docA);

  const shiftedRange = resolveRange(docA, textA, startAnchor, endAnchor);
  assert.equal(
    textA.toString().slice(shiftedRange.start, shiftedRange.end),
    hero
  );

  const replacement = `<section class="hero" style="transform: translate(24px, 12px);">
        <h1>Build slides visually</h1>
        <p><strong>Multiplayer</strong> AI editing.</p>
        <div class="actions"><button>Try it</button><a href="#">Learn more</a></div>
      </section>`;

  docA.transact(() => {
    textA.delete(shiftedRange.start, shiftedRange.end - shiftedRange.start);
    textA.insert(shiftedRange.start, replacement);
  });

  const finalHtml = textA.toString();
  assert.ok(finalHtml.includes(remoteInsertion));
  assert.ok(finalHtml.includes(replacement));
  assert.ok(!finalHtml.includes(`<h1>Build slides together</h1>`));

  const streamDocA = new Y.Doc();
  const streamDocB = new Y.Doc();
  const streamTextA = streamDocA.getText("slide:sample");
  streamTextA.insert(0, html);
  syncUpdate(streamDocA, streamDocB);
  const streamTextB = streamDocB.getText("slide:sample");
  const streamRange = findElementSourceRange(streamTextA.toString(), [1, 0]);
  assert.ok(streamRange, "Expected streaming source range");
  let streamStartAnchor = Y.createRelativePositionFromTypeIndex(
    streamTextA,
    streamRange.start,
    0
  );
  let streamEndAnchor = Y.createRelativePositionFromTypeIndex(
    streamTextA,
    streamRange.end,
    -1
  );

  const streamReplacement1 = `<section class="hero" style="transform: translate(10px, 5px);">
        <h1>Build slides together</h1>
        <p><strong>Multiplayer</strong> AI editing.</p>
        <div class="actions"><button>Try it</button><a href="#">Learn more</a></div>
      </section>`;
  ({ startAnchor: streamStartAnchor, endAnchor: streamEndAnchor } =
    replaceAndReanchor(
      streamDocA,
      streamTextA,
      streamStartAnchor,
      streamEndAnchor,
      streamReplacement1
    ));
  syncUpdate(streamDocA, streamDocB);

  const streamingRemoteInsertion = `\n    <aside data-remote="true">Remote edit during drag</aside>`;
  streamTextB.insert(streamRange.start, streamingRemoteInsertion);
  syncUpdate(streamDocB, streamDocA);

  const streamReplacement2 = `<section class="hero" style="transform: translate(20px, 10px);">
        <h1>Build slides visually</h1>
        <p><strong>Multiplayer</strong> AI editing.</p>
        <div class="actions"><button>Try it</button><a href="#">Learn more</a></div>
      </section>`;
  ({ startAnchor: streamStartAnchor, endAnchor: streamEndAnchor } =
    replaceAndReanchor(
      streamDocA,
      streamTextA,
      streamStartAnchor,
      streamEndAnchor,
      streamReplacement2
    ));

  const streamReplacement3 = `<section class="hero" style="transform: translate(30px, 15px);">
        <h1>Build slides visually</h1>
        <p><strong>Multiplayer</strong> AI editing.</p>
        <div class="actions"><button>Try it</button><a href="#">Learn more</a></div>
      </section>`;
  ({ startAnchor: streamStartAnchor, endAnchor: streamEndAnchor } =
    replaceAndReanchor(
      streamDocA,
      streamTextA,
      streamStartAnchor,
      streamEndAnchor,
      streamReplacement3
    ));

  const streamingHtml = streamTextA.toString();
  assert.ok(streamingHtml.includes(streamingRemoteInsertion));
  assert.equal(
    streamingHtml.split(streamReplacement3).length - 1,
    1,
    "Expected the final streamed element exactly once"
  );
  assert.ok(!streamingHtml.includes(streamReplacement1));
  assert.ok(!streamingHtml.includes(streamReplacement2));

  const deleteDocA = new Y.Doc();
  const deleteDocB = new Y.Doc();
  const deleteTextA = deleteDocA.getText("slide:sample");
  deleteTextA.insert(0, html);
  syncUpdate(deleteDocA, deleteDocB);
  const deleteTextB = deleteDocB.getText("slide:sample");
  const deleteRange = findElementSourceRange(deleteTextA.toString(), [1, 0]);
  assert.ok(deleteRange, "Expected deletion source range");

  const deleteStartAnchor = Y.createRelativePositionFromTypeIndex(
    deleteTextA,
    deleteRange.start,
    0
  );
  const deleteEndAnchor = Y.createRelativePositionFromTypeIndex(
    deleteTextA,
    deleteRange.end,
    -1
  );

  deleteTextB.delete(deleteRange.start, deleteRange.end - deleteRange.start);
  syncUpdate(deleteDocB, deleteDocA);

  const deletedRange = resolveRange(
    deleteDocA,
    deleteTextA,
    deleteStartAnchor,
    deleteEndAnchor
  );
  assert.ok(
    deletedRange.end <= deletedRange.start,
    "Expected remotely deleted element range to collapse or become invalid"
  );

  console.log("source-map and Yjs relative-position tests passed");
} finally {
  await rm(compiledPath, { force: true });
}
