"use client";

import { EyeIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProposalCodePreview({
  html,
  resolvingProposal,
  onResolveProposal,
}: {
  html: string;
  resolvingProposal: "apply" | "reject" | null;
  onResolveProposal: (action: "apply" | "reject") => void;
}) {
  return (
    <div className="relative h-full min-h-0 bg-white">
      <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-primary/30 bg-white py-1.5 pl-4 pr-1.5 shadow-md">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-neutral-700">
          <EyeIcon className="size-4 text-primary" />
          Previewing proposed code
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onResolveProposal("reject")}
            disabled={resolvingProposal !== null}
            className="rounded-full"
          >
            {resolvingProposal === "reject" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Reject
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => onResolveProposal("apply")}
            disabled={resolvingProposal !== null}
          >
            {resolvingProposal === "apply" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Accept
          </Button>
        </div>
      </div>

      <pre className="h-full overflow-auto bg-white px-4 pb-4 pt-16 font-mono text-[13px] leading-5 text-neutral-900">
        <code>{html}</code>
      </pre>
    </div>
  );
}
