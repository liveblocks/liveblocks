// Every room has one chat feed, shared by the chat UI and the AI assistant
// (which posts its replies from the server). Feeds are scoped to a room, but
// the client caches feed messages by feed id alone, so the id includes the
// room id or a new room would briefly show the previous room's chat.
export function getChatFeedId(roomId: string) {
  return `chat:${roomId}`;
}
