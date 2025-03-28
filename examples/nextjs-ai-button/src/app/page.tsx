"use client";

import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import JobApplicationForm from "../components/JobApplicationForm";

export default function Page() {
  return (
    <main>
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >

        <div className="composer-container">
          <JobApplicationForm />
        </div>
      </LiveblocksProvider>
    </main>
  );
}
