import React, { useState } from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import { transactions } from "@/data/transactions";
import { format } from "date-fns";
import { expense_statuses } from "@/data/schema";
import { users } from "@/data/users";
import Image from "next/image";
import { defineAiTool } from "@liveblocks/client";
import { useRouter } from "next/navigation";
import { AiTool } from "@liveblocks/react-ui";
import { toast } from "sonner";
import { RegisterAiTool } from "@liveblocks/react";

export function NavigateToPageTool() {
  const router = useRouter();

  return (
    <RegisterAiTool
      name="navigate-to-page"
      tool={defineAiTool()({
        description:
          "Redirect the user to a page. Just say you've found the page, or you can't find it, then do it",
        parameters: {
          type: "object",
          properties: {
            relativeUrl: { type: "string" },
          },
          additionalProperties: false,
          required: ["relativeUrl"],
        },
        execute: ({ relativeUrl }) => {
          router.push(relativeUrl);
          toast(`Redirecting to ${relativeUrl}...`, {
            action: {
              label: "Go back",
              onClick: () => router.back(),
            },
          });
          return "Redirecting user to the page. Do not write anything else.";
        },
        render: ({ args }) =>
          args ? <AiTool title={`Redirected to ${args.relativeUrl}`} /> : null,
      })}
    />
  );
}

export const TOOLS = {
  "invite-member": defineAiTool()({
    description: "Invite a new member to the team",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string" },
      },
      additionalProperties: false,
      required: ["email"],
    },
    render: ({ args }) => {
      if (!args) return null;

      return (
        <AiTool title="Invite member">
          <AiTool.Confirmation
            confirm={() => {
              toast.success(`${args.email} has been invited`);
              return "Invited to the team";
            }}
            cancel={() => {
              return "The user cancelled the invite";
            }}
          >
            Invite <code>{args.email}</code> to the team?
          </AiTool.Confirmation>
        </AiTool>
      );
    },
  }),
  transaction: defineAiTool()({
    description: "Display the transaction details",
    parameters: {
      type: "object",
      properties: {
        transactionId: { type: "string" },
      },
      additionalProperties: false,
      required: ["transactionId"],
    },
    render: ({ args }) => {
      if (!args) return null;
      return <TransactionTool transactionId={args.transactionId} />;
    },
  }),
  member: defineAiTool()({
    description: "Display the member details",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string" },
      },
      additionalProperties: false,
      required: ["email"],
    },
    render: ({ args }) => {
      if (!args) return null;
      return <MemberTool email={args.email} />;
    },
  }),
};

function InviteMemberFormTool({ email, id }: { email: string; id: string }) {
  const [emailValue, setEmailValue] = useState(email);

  return (
    <div className="my-2 pt-2.5 pb-4 px-4 rounded bg-neutral-100 w-full">
      <Label htmlFor={id} className="font-medium pb-4 grow">
        Invite a team member
      </Label>
      <div className="flex gap-2 w-full mt-1.5">
        <Input
          className="grow"
          id={id}
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
        />
        <Button
          onClick={() => {
            // TODO
            console.log(emailValue);
          }}
        >
          Invite
        </Button>
      </div>
    </div>
  );
}

function TransactionTool({ transactionId }: { transactionId: string }) {
  const transaction = transactions.find(
    (transaction) => transaction.transaction_id === transactionId
  );

  if (!transaction) {
    return <div>Transaction not found</div>;
  }

  const status = expense_statuses.find(
    (item) => item.value === transaction.expense_status
  );

  return (
    <div className="my-2 pt-3.5 pb-4 px-4 rounded bg-neutral-100 w-full">
      <div className="flex justify-between items-center">
        <div className="font-semibold flex items-center gap-1">
          {transaction.merchant}{" "}
          <a href="#">
            <svg
              className="text-blue-600 w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </a>
        </div>
        <Badge variant={status?.variant as any}>{status?.label}</Badge>
      </div>

      <div className="text-xs flex gap-1.5 mt-0.5 items-center">
        {format(transaction.transaction_date, "MMM d yyyy")}, $
        {transaction.amount.toLocaleString()}
      </div>
    </div>
  );
}

function MemberTool({ email }: { email: string }) {
  const user = users.find((user) => user.email === email);

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="flex items-center gap-2 my-2 bg-neutral-100 p-4 rounded">
      <Image
        src={user.avatar}
        alt={`${user.name}'s avatar`}
        width={36}
        height={36}
        className="size-9 rounded-full border border-gray-300 object-cover dark:border-gray-700"
      />
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {user?.name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {user?.email}
        </p>
      </div>
    </div>
  );
}
