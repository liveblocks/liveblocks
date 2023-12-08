import { BroadcastedEventServerMsg } from "@liveblocks/core";

export async function POST(request: Request) {
  const data = await request.json();
  console.log(data.type, JSON.stringify(data.event, null, 2));

  if (data.event.type === "message") {
    if (data.event.subtype === "message_deleted") {
      // Deleted message
      return new Response(data.challenge);
    }
    if (data.event.subtype === "message_changed") {
      // Edited message
      // (maybe ran after a delete too?)
      // data.event.message.text
      // data.event.message.blocks
      return new Response(data.challenge);
    }
    if (data.event.bot_id) {
      // Bot (aka your bot posted it), ignore...
      console.log("BOT");
      return new Response(data.challenge);
    }

    console.log("USER", data.event.text);
    if (data.event.thread_ts) {
      // Add reply to thread
    } else {
      // Create new thread
    }
  }

  // NEED METADATA ON COMMENTS FOR REACTIONS?

  if (data.event.type === "reaction_added") {
    // New reaction
    // data.event.item.ts === thread.metadata.ts
    return new Response(data.challenge);
  }

  if (data.event.type === "reaction_removed") {
    // data.event.item.ts === thread.metadata.ts
    return new Response(data.challenge);
  }

  return new Response(data.challenge);
}

async function createComment(event: any) {
  const threadId = event.metadata.event_payload.threadId;
}
