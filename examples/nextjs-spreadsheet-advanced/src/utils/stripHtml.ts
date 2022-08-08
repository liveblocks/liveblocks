const htmlRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>?/gi;

export function stripHtml(html: string) {
  return html.replace(htmlRegex, "").trim();
}
