// Small, dependency-free helpers for working with email content. Safe to
// import from both server routes and client components.

// Parses "Jane Doe <jane@example.com>" (or a bare address) into its parts.
export function parseAddress(raw: string): { name: string; email: string } {
  const match = raw.trim().match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const email = match[2].trim().toLowerCase();
    const name = match[1].trim() || nameFromEmail(email);
    return { name, email };
  }
  const email = raw.trim().toLowerCase();
  return { name: nameFromEmail(email), email };
}

// "priya.raman@acme.com" → "Priya Raman"
export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

// Best-effort conversion of an HTML email body to readable plain text, used
// when an inbound email has no text part. Block-level tags become line breaks
// and everything else is stripped.
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|pre)>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

// Converts an agent's plain-text reply into simple, well-formed HTML so the
// customer's mail client renders paragraphs properly.
export function textToHtml(text: string) {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 1em;line-height:1.5">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Splits an email body into the new content and the quoted history ("On
// … wrote:" / lines starting with ">"), so the UI can collapse the quote.
export function splitQuotedText(text: string): {
  body: string;
  quoted: string | null;
} {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let cut = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^>/.test(line) || /^On .{6,120} wrote:\s*$/.test(line)) {
      cut = i;
      break;
    }
    if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(line.trim())) {
      cut = i;
      break;
    }
  }
  if (cut === -1) {
    return { body: text.trim(), quoted: null };
  }
  const body = lines.slice(0, cut).join("\n").trim();
  const quoted = lines.slice(cut).join("\n").trim();
  return { body: body || text.trim(), quoted: body ? quoted : null };
}
