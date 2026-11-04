"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { docId: string | null; children: ReactNode };
type State = { error: Error | null };

// Keeps a crash inside one document (the editor, the canvas, the PDF
// renderer) from taking down the whole room: the rest of the UI stays up,
// the error is logged, and the document can be reopened in place.
export class DocErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[document] crashed", error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    // Switching documents starts fresh
    if (previous.docId !== this.props.docId && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-medium">This document stopped responding</p>
        <p className="max-w-md text-sm break-words text-neutral-500">
          {error.message}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => this.setState({ error: null })}
        >
          Reopen document
        </Button>
      </div>
    );
  }
}
