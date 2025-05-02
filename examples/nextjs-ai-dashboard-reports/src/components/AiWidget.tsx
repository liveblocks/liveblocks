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
      chatId="main-2"
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
            return <InviteMemberForm email={email} />;
          },
        },
      }}
    />
  );
}

// A unique ID for the tool would help
function InviteMemberForm({ email }: { email: string }) {
  const [emailValue, setEmailValue] = useState(email);

  return (
    <div className="my-2 pt-3 pb-4 px-4 rounded bg-gray-100 w-full">
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
            console.log(emailValue);
          }}
        >
          Invite
        </Button>
      </div>
    </div>
  );
}
