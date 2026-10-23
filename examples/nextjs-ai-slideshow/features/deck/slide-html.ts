export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

const STARTER_BODY = `
  <section class="card">
    <div class="eyebrow">Collaborative editing</div>
    <h1>Move elements, edit code, chat to AI.</h1>
    <p>Each user’s live presence is shown as they drag elements, edit code, and leave comments for others. Double-click on text to make changes.</p>
  </section>
`;

const EMPTY_BODY = `
  <section class="card">
    <div class="eyebrow">Collaborative editing</div>
    <h1>Get started by chatting to AI</h1>
    <p>It’ll generate initial designs for you, and you can take it from there. Or dive into the code if you’d prefer.</p>
  </section>
`;

const CREATE_BODY = (slideContent: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=1280, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> 
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1280px;
        height: 720px;
        overflow: hidden;
        font-family: "Helvetica Neue", Helvetica, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
        margin: 0 0 30px;
        color: #fd5108;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: 78px;
        line-height: 0.98;
        letter-spacing: -0.01em;
        font-family: "Merriweather", Georgia, serif;
        font-weight: 600;
      }
      p {
        max-width: 680px;
        margin: 28px auto 0;
        color: #475569;
        font-size: 28px;
        line-height: 1.35;
      }
    </style>
  </head>
  <body>
    <main class="slide">
      ${slideContent}
    </main>
  </body>
</html>`;

export const STARTER_SLIDE_HTML = CREATE_BODY(STARTER_BODY);
export const EMPTY_SLIDE_HTML = CREATE_BODY(EMPTY_BODY);
