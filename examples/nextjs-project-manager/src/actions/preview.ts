"use server";

import { parse } from "node-html-parser";

export type LinkPreviewMetadata = {
  title: string | null;
  canonical: string | null;
  description: string | null;
  icon: string | null;
};

export async function getPreviewData(
  url: string
): Promise<
  { error: string; data?: never } | { data: LinkPreviewMetadata; error?: never }
> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Link preview: No response");
      return { error: "No response" };
    }

    const page = await response.text();
    const $ = parse(page);

    const data = {
      title: $.querySelector("title")?.text || null,
      canonical:
        $.querySelector("link[rel=canonical]")?.getAttribute("href") || null,
      description:
        $.querySelector("meta[name=description]")?.getAttribute("content") ||
        null,
      icon:
        $.querySelector(
          'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
        )?.getAttribute("href") || null,
    };

    console.log(data);

    return { data };
  } catch (err) {
    console.error("Link preview:", err);
    return { error: "Can't fetch website" };
  }
}
