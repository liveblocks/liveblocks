"use client";

import { useSelf } from "@liveblocks/react/suspense";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  CopyIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getUsers } from "@/app/database";
import type { InboxSettings } from "@/lib/api";
import { cn } from "@/lib/utils";
import { WORKSPACES, type Workspace } from "@/lib/workspaces";
import { AgentAvatar } from "./avatars";

/**
 * A read-only settings page that explains how this deployment is wired up:
 * whether a real Resend inbox is connected, where the webhook should point,
 * and who's on the team.
 */
export function SettingsView({
  settings,
  workspace,
  connected,
  className,
}: {
  settings: InboxSettings | null;
  workspace: Workspace;
  // Whether this workspace's inbox is connected to Resend.
  connected: boolean;
  className?: string;
}) {
  const self = useSelf();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const webhookUrl = `${origin || "https://your-app.example"}/api/webhooks/resend`;

  return (
    <section
      className={cn("scroll-quiet min-w-0 flex-1 overflow-y-auto bg-surface md:card", className)}
      aria-label="Settings"
    >
      <div className="mx-auto w-full max-w-[680px] px-6 py-8 md:px-10">
        <h1 className="text-lg font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          How this inbox is connected.
        </p>

        <Card title="Email">
          <Row
            label="Status"
            value={
              settings === null ? (
                <span className="text-ink-muted">Checking…</span>
              ) : connected ? (
                <Pill tone="ok">
                  <CheckCircle2Icon className="size-3" />
                  Connected to Resend
                </Pill>
              ) : settings.mode === "resend" ? (
                <Pill>
                  <CircleDashedIcon className="size-3" />
                  Sample workspace
                </Pill>
              ) : (
                <Pill>
                  <CircleDashedIcon className="size-3" />
                  Demo mode
                </Pill>
              )
            }
          />
          <Row
            label="Inbox address"
            value={
              connected && settings?.inboxAddress ? (
                <code className="font-mono text-xs">{settings.inboxAddress}</code>
              ) : (
                <span className="text-ink-muted">
                  {workspace.address} (sample)
                </span>
              )
            }
          />
          <Row
            label="Incoming email webhook"
            value={
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <code className="truncate font-mono text-xs">{webhookUrl}</code>
                <CopyButton value={webhookUrl} />
              </span>
            }
          />
          <Row
            label="Webhook signing"
            value={
              settings?.webhookConfigured ? (
                <Pill tone="ok">
                  <CheckCircle2Icon className="size-3" />
                  Secret configured
                </Pill>
              ) : (
                <span className="text-ink-muted">
                  Set <code className="font-mono text-xs">RESEND_WEBHOOK_SECRET</code>
                </span>
              )
            }
          />
          {!connected && !workspace.connectable ? (
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              This workspace runs on sample conversations: replies are
              simulated and nothing is delivered. Only the{" "}
              {WORKSPACES.find((item) => item.connectable)?.name} workspace can
              be connected to a Resend inbox.
            </p>
          ) : !connected ? (
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Replies are simulated and nothing is delivered. To send and
              receive real email, add <Env>RESEND_API_KEY</Env>,{" "}
              <Env>RESEND_INBOX_ID</Env> and <Env>RESEND_WEBHOOK_SECRET</Env>{" "}
              to <Env>.env.local</Env>, then create a Resend webhook for the{" "}
              <code className="font-mono">inbox.email.received</code> event
              pointing at the URL above.{" "}
              <a
                href="https://resend.com/docs/dashboard/inboxes/introduction"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-ink underline-offset-2 hover:underline"
              >
                Resend Inboxes docs
                <ExternalLinkIcon className="size-3" />
              </a>
            </p>
          ) : null}
        </Card>

        <Card title="Team">
          <ul className="-my-1 flex flex-col">
            {getUsers().map((agent) => (
              <li
                key={agent.id}
                className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
              >
                <AgentAvatar userId={agent.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">
                    {agent.info.name}
                    {agent.id === self.id ? (
                      <span className="font-normal text-ink-faint"> (you)</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-ink-muted">
                    {agent.info.title} · {agent.id}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Realtime">
          <p className="text-xs leading-relaxed text-ink-muted">
            Conversations are Liveblocks Feeds inside one room per shared
            inbox: every email and internal note is a feed message, and status,
            priority and assignee live in the feed metadata.
            Presence powers the live avatars that show who is reading a thread.
          </p>
        </Card>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-2.5 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
        {title}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-[13px]">
      <span className="shrink-0 text-ink-secondary">{label}</span>
      <span className="min-w-0 truncate text-right text-ink">{value}</span>
    </div>
  );
}

function Pill({
  tone = "default",
  children,
}: {
  tone?: "default" | "ok";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium",
        tone === "ok"
          ? "border-open/25 bg-open/8 text-open"
          : "border-line bg-hover text-ink-secondary"
      )}
    >
      {children}
    </span>
  );
}

function Env({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-hover px-1 py-px font-mono text-[11px] text-ink">
      {children}
    </code>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="flex size-5 shrink-0 items-center justify-center rounded text-ink-faint hover:bg-hover hover:text-ink"
      aria-label="Copy webhook URL"
    >
      {copied ? (
        <CheckCircle2Icon className="size-3 text-open" />
      ) : (
        <CopyIcon className="size-3" />
      )}
    </button>
  );
}
