import React from "react";
import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="bg-surface-elevated border border-border rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-text mb-2">Import Markdown</h1>
          <p className="text-text-light mb-6">
            Paste your markdown content below to create a new collaborative document.
          </p>
          <ImportForm />
        </div>
      </div>
    </div>
  );
}
