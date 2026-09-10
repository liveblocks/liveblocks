import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

// A new chat gets its id up front, so the URL is stable from the first
// message on and nothing navigates once the chat is created.
export const dynamic = "force-dynamic";

export default function Page() {
  redirect(`/chat/${nanoid()}`);
}
