export async function POST(request: Request) {
  const data = await request.json();
  console.log("Received event", data.type, JSON.stringify(data.event, null, 2));
  return new Response(data.challenge);
}
