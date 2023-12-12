// ./app/api/chat/route.js
import OpenAI from "openai";
// import { OpenAIStream, StreamingTextResponse } from "ai";
import { Liveblocks } from "@liveblocks/node";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

// export const runtime = "edge";

export async function GET(req: Request) {
  const prompt = "List some veg";
  //const { messages } = await req.json();
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    // stream: true,
    //messages,
    messages: [
      {
        content: `You are a helpful assistant that replies to comments. 
        Your output will go directly into a comment.
         
        You must output in a custom format. Create a string that goes into JSON.parse();
        The format is an array of \`CommentBodyParagraph\` types, each being an object that contains a paragraph. Here's an example:
        
        \`\`\`json
        [
          {
            type: "paragraph",
            children: [
              { text: "Hello " },
              { text: "world", bold: true }
            ]
          },
          {
            type: "paragraph",
            children: [
              { text: "A second paragraph" }
            ]
          }
        ]
        \`\`\`
        
        DO NOT include \`\`\`json and \`\`\` in your response. It puts be a pure JSON array.
                
     
        Here's the full type definitions to help you out:
        \`\`\`ts
        type CommentBodyInlineElement =
          | CommentBodyText
          | CommentBodyMention
          | CommentBodyLink;
        
        type CommentBodyElement =
          | CommentBodyBlockElement
          | CommentBodyInlineElement;
        
        type CommentBodyParagraph = {
          type: "paragraph";
          children: CommentBodyInlineElement[];
        };
        
        type CommentBodyMention = {
          type: "mention";
          id: string;
        };
        
        type CommentBodyLink = {
          type: "link";
          url: string;
        };
        
        type CommentBodyText = {
          bold?: boolean;
          italic?: boolean;
          strikethrough?: boolean;
          code?: boolean;
          text: string;
        };
        \`\`\`
        
        You will most likely only need one paragraph, as you must keep responses short.
        Generally a few sentences at most.
        
        
        Here is your prompt:
        """
        ${prompt}
        """
        `,
        role: "assistant",
      },
    ],
  });
  // console.log(JSON.stringify(response, null, 2));

  const message = JSON.parse(response.choices[0].message.content as string);
  console.log(JSON.stringify(message, null, 2));
  await liveblocks.createComment({
    roomId: "nextjs-comments-35235235",
    threadId: "th_JcSrowQJawduf2g9tv59v",
    data: {
      userId: "chris@example.com",
      body: {
        version: 1,
        content: message,
      },
    },
  });
  return new Response("", { status: 200 });
  //const stream = OpenAIStream(response);
  //return new StreamingTextResponse(stream);
}
