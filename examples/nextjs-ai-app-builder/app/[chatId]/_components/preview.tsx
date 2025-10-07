"use client";

import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { useStorage, useAiChatStatus } from "@liveblocks/react";

import { Spinner } from "@/components/ui/spinner";

export function Preview({ chatId }: { chatId: string }) {
  const code = useStorage((root) => root.code);
  const { status, toolName } = useAiChatStatus(chatId);
  const generatingCode = status === "generating" && toolName === "edit-code";

  if (code === null) {
    return <Spinner />;
  }

  return (
    <SandpackProvider
      template="react-ts"
      files={{ "/App.js": code }}
      options={{
        externalResources: ["https://cdn.tailwindcss.com"],
        // autoReload: generatingCode ? false : true,
        recompileMode: generatingCode ? "delayed" : "immediate",
        // recompileDelay: 15000,
      }}
      style={{
        position: "absolute",
        inset: 0,
      }}
    >
      <SandpackLayout
        style={{ height: "100%", width: "100%", borderRadius: 0, border: 0 }}
      >
        <SandpackPreview
          style={{ height: "100%", width: "100%", borderRadius: 0 }}
          showNavigator={true}
          showOpenNewtab={false}
          showOpenInCodeSandbox={false}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}
