"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { nanoid } from "nanoid";
import { createRoomWithMarkdown } from "./actions";

export function ImportForm() {
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const roomId = await createRoomWithMarkdown(markdown);
        router.push(`/?roomId=${roomId}`);
      }}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="markdown"
          className="block text-sm font-medium text-text mb-2"
        >
          Markdown Content
        </label>
        <textarea
          id="markdown"
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="# My Document

Start writing your markdown here..."
          className="w-full h-64 px-3 py-2 border border-border rounded-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none font-mono text-sm"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!markdown.trim() || isLoading}>
          {isLoading ? "Creating..." : "Create Document"}
        </Button>
      </div>
    </form>
  );
}
