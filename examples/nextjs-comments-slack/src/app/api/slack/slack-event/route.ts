import { createComment, createThread } from "./slack";

export async function POST(request: Request) {
  const data = await request.json();
  const successResponse = new Response(data.challenge);
  if (!data.event) {
    console.log("No event");
    return successResponse;
  }

  console.log(data.event.type);

  if (data.event.type === "message") {
    if (data.event.subtype === "message_deleted") {
      // Deleted message
      return successResponse;
    }
    if (data.event.subtype === "message_changed") {
      // Edited message
      // (maybe ran after a delete too?)
      // data.event.message.text
      // data.event.message.blocks
      return successResponse;
    }
    if (data.event.bot_id) {
      // Bot (aka your bot posted it), ignore...
      return successResponse;
    }

    if (data.event.thread_ts) {
      // Add reply to thread
      await createComment(data.event);
      return successResponse;
    } else {
      // Create new thread
      await createThread(data.event);
      return successResponse;
    }
  }

  // NEED METADATA ON COMMENTS FOR REACTIONS?

  if (data.event.type === "reaction_added") {
    // New reaction
    // data.event.item.ts === thread.metadata.ts
    return successResponse;
  }

  if (data.event.type === "reaction_removed") {
    // data.event.item.ts === thread.metadata.ts
    return successResponse;
  }

  return successResponse;
}
