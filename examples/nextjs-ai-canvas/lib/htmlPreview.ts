export function toRenderableHtmlDocument(html: string) {
  const styleMatches = Array.from(
    html.matchAll(/<style[\s\S]*?<\/style>/gi),
    (match) => match[0]
  );
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch
    ? bodyMatch[1]
    : html
        .replace(/<!doctype[^>]*>/gi, "")
        .replace(/<\/?(html|head|body)[^>]*>/gi, "");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      html, body {
        margin: 0;
        padding: 0;
      }
    </style>
    ${styleMatches.join("\n")}
  </head>
  <body>
    ${bodyContent}
  </body>
</html>`;
}
