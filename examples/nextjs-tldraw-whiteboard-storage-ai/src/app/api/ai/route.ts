import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: Request) {
  const { input, roomId } = await request.json();

  // Mutate a single room
  await liveblocks.mutateStorage(
    roomId,

    async ({ root }) => {
      const records = root.get("records");

      // exampleOutput.forEach(([id, record]) => {
      //   records.set(id as string, record);
      // });

      const { text } = await generateText({
        model: openai("o3-mini"),
        system: SYSTEM_PROMPT,
        prompt: input,
      });

      const start = text.indexOf("<!DOCTYPE html>");
      const end = text.indexOf("</html>");
      const html = text.slice(start, end + "</html>".length);
      console.log("html", html);

      // No HTML? Something went wrong
      if (html.length < 100) {
        console.warn(text);
        throw Error("Could not generate a design from those wireframes.");
      }

      const shapeId = `shape:${nanoid()}`;
      records.set(shapeId, {
        id: shapeId,
        typeName: "response",
        props: {
          html,
          w: (960 * 2) / 3,
          h: (540 * 2) / 3,
        },
        x: 0,
        y: 0,
        rotation: 0,
        index: "a1",
        parentId: "page:page",
        isLocked: false,
        opacity: 1,
        meta: {},
      });

      // root.get("records").set(text);

      // root.get("records").push(text);
    }
  );

  return new Response();
}

const SYSTEM_PROMPT = `You are an expert web developer who specializes in building working website prototypes from low-fidelity wireframes. Your job is to accept low-fidelity designs and turn them into high-fidelity interactive and responsive working prototypes.

## Your task

When sent new designs, you should reply with a high-fidelity working prototype as a single HTML file.

## Important constraints

- Your ENTIRE PROTOTYPE needs to be included in a single HTML file.
- Your response MUST contain the entire HTML file contents.
- Put any JavaScript in a <script> tag with \`type="module"\`.
- Put any additional CSS in a <style> tag.
- Your protype must be responsive.
- The HTML file should be self-contained and not reference any external resources except those listed below:
	- Use tailwind (via \`cdn.tailwindcss.com\`) for styling.
	- Use unpkg or skypack to import any required JavaScript dependencies.
	- Use Google fonts to pull in any open source fonts you require.
	- If you have any images, load them from Unsplash or use solid colored rectangles as placeholders.
	- Create SVGs as needed for any icons.

## Additional Instructions

The designs may include flow charts, diagrams, labels, arrows, sticky notes, screenshots of other applications, or even previous designs. Treat all of these as references for your prototype.

The designs may include structural elements (such as boxes that represent buttons or content) as well as annotations or figures that describe interactions, behavior, or appearance. Use your best judgement to determine what is an annotation and what should be included in the final result. Annotations are commonly made in the color red. Do NOT include any of those annotations in your final result.

If there are any questions or underspecified features, use what you know about applications, user experience, and website design patterns to "fill in the blanks". If you're unsure of how the designs should work, take a guess—it's better for you to get it wrong than to leave things incomplete.

Your prototype should look and feel much more complete and advanced than the wireframes provided. Flesh it out, make it real!

IMPORTANT LAST NOTES
- The last line of your response MUST be </html>
- The prototype must incorporate any annotations and feedback.
- Make it cool. You're a cool designer, your prototype should be an original work of creative genius.

Remember: you love your designers and want them to be happy. The more complete and impressive your prototype, the happier they will be. You are evaluated on 1) whether your prototype resembles the designs, 2) whether your prototype is interactive and responsive, and 3) whether your prototype is complete and impressive.
`;
