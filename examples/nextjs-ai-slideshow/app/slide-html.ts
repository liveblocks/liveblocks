export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

export const STARTER_SLIDE_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=1280, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1280px;
        height: 720px;
        overflow: hidden;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111827;
        background: #fff7ed;
      }
      .slide {
        position: relative;
        display: grid;
        place-items: center;
        width: 1280px;
        height: 720px;
        padding: 80px;
        background:
          radial-gradient(circle at 18% 18%, rgba(253, 81, 8, 0.22), transparent 28%),
          radial-gradient(circle at 82% 72%, rgba(255, 138, 76, 0.28), transparent 30%),
          linear-gradient(135deg, #fff7ed 0%, #fff1f2 52%, #ffffff 100%);
      }
      .card {
        width: 900px;
        padding: 72px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 40px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12);
        text-align: center;
      }
      .eyebrow {
        margin: 0 0 20px;
        color: #fd5108;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: 82px;
        line-height: 0.98;
        letter-spacing: -0.06em;
      }
      p {
        max-width: 680px;
        margin: 28px auto 0;
        color: #475569;
        font-size: 30px;
        line-height: 1.35;
      }
    </style>
  </head>
  <body>
    <main class="slide">
      <section class="card">
        <p class="eyebrow">Liveblocks AI Slideshow</p>
        <h1>Design together, present faster.</h1>
        <p>Prompt the AI, apply its slide HTML into a shared Yjs document, and leave multiplayer comments right on the preview.</p>
      </section>
    </main>
  </body>
</html>`;
