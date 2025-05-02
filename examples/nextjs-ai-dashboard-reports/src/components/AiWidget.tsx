"use client";

import React, { useState } from "react";
import * as PopoverPrimitives from "@radix-ui/react-popover";
import { RiCloseCircleLine, RiRobot2Line } from "@remixicon/react";
import { cx } from "@/lib/utils";
import { AiChat } from "@liveblocks/react-ui";
import useSWR from "swr";
import { Button } from "./Button";
import { Input } from "./Input";
import { Label } from "./Label";
import { transactions } from "@/data/transactions";
import { format } from "date-fns";
import { Badge } from "./Badge";
import { expense_statuses } from "@/data/schema";
import { users } from "@/data/users";
import Image from "next/image";

export function AiWidget() {
  return (
    <div className="ai-widget-container">
      <PopoverPrimitives.Root defaultOpen={true}>
        <PopoverPrimitives.Trigger asChild>
          <button
            className={cx(
              "flex h-12 w-12 items-center justify-center rounded-full",
              "bg-blue-600 text-white shadow-lg hover:bg-blue-700",
              "fixed bottom-5 right-5 z-40 transition-all duration-200"
            )}
            aria-label="Open AI Assistant"
          >
            <RiRobot2Line className="h-6 w-6" />
          </button>
        </PopoverPrimitives.Trigger>
        <PopoverPrimitives.Portal>
          <PopoverPrimitives.Content
            sideOffset={16}
            side="top"
            align="end"
            onInteractOutside={(e) => {
              // If you don't want it to close when clicking outside
              e.preventDefault();
            }}
            className={cx(
              "fixed bottom-0 right-0 z-50",
              "max-h-[80vh] w-[380px] max-w-[90vw] overflow-hidden rounded-xl border shadow-xl",
              "border-gray-200 dark:border-gray-800",
              "text-gray-900 dark:text-gray-50",
              "bg-white dark:bg-gray-950",
              "will-change-[transform,opacity]",
              "data-[state=closed]:animate-hide",
              "data-[state=open]:animate-slideUpAndFade"
            )}
          >
            <div className="relative h-full w-full">
              <div className="h-11 border-b flex justify-between items-center pr-1.5 pl-4">
                <span className="text-sm font-medium text-gray-700">
                  AI Assistant
                </span>
                <PopoverPrimitives.Close className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 hover:dark:bg-gray-800">
                  <RiCloseCircleLine className="h-5 w-5 text-gray-500" />
                </PopoverPrimitives.Close>
              </div>
              <div>
                <Chat />
              </div>
            </div>
          </PopoverPrimitives.Content>
        </PopoverPrimitives.Portal>
      </PopoverPrimitives.Root>
    </div>
  );
}

function Chat() {
  const { data: contexts } = useSWR(
    "/api/liveblocks-ai-context",
    (resource: string, init: RequestInit) =>
      fetch(resource, init).then((res) => res.json())
  );

  return (
    <AiChat
      chatId="main-4"
      className="max-h-96"
      contexts={contexts}
      tools={{
        "invite-member": {
          description: "Invite a new member to the team",
          parameters: {
            type: "object",
            properties: {
              email: { type: "string" },
            },
          },
          render: ({ args: { email } }) => {
            return <InviteMemberFormTool email={email} />;
          },
        },
        transaction: {
          description: "Display the transaction details",
          parameters: {
            type: "object",
            properties: {
              transactionId: { type: "string" },
            },
          },
          render: ({ args: { transactionId } }) => {
            return <TransactionTool transactionId={transactionId} />;
          },
        },
        member: {
          description: "Display the member details",
          parameters: {
            type: "object",
            properties: {
              email: { type: "string" },
            },
          },
          render: ({ args: { email } }) => {
            return <MemberTool email={email} />;
          },
        },
      }}
    />
  );
}

// A unique ID for the tool would help
function InviteMemberFormTool({ email }: { email: string }) {
  const [emailValue, setEmailValue] = useState(email);

  return (
    <div className="my-2 pt-2.5 pb-4 px-4 rounded bg-neutral-100 w-full">
      <Label htmlFor="inviteMemberEmail" className="font-medium pb-4 grow">
        Invite a team member
      </Label>
      <div className="flex gap-2 w-full mt-1.5">
        <Input
          className="grow"
          id="inviteMemberEmail"
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
