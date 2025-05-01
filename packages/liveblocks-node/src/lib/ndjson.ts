import type { Json } from "@liveblocks/core";

export class LineStream extends TransformStream<string, string> {
  constructor() {
    let buffer: string = "";

    super({
      transform(
        chunk: string,
        controller: TransformStreamDefaultController<string>
      ) {
        // Append the chunk to the buffer
        buffer += chunk;
        if (buffer.includes("\n")) {
          // Split the buffer into lines
          const lines = buffer.split("\n");

          // Emit all lines... except the last one!
          for (let i = 0; i < lines.length - 1; i++) {
            // Skip empty lines
            if (lines[i]!.length > 0) {
              controller.enqueue(lines[i]);
            }
          }

          // Update the buffer with the last line (might be incomplete)
          buffer = lines[lines.length - 1]!;
        }
      },

      flush(controller: TransformStreamDefaultController<string>) {
        // Emit the remaining buffer as a line
        if (buffer.length > 0) {
          controller.enqueue(buffer);
        }
      },
    });
  }
}

export class NdJsonStream<J extends Json> extends TransformStream<string, J> {
  constructor() {
    super({
      transform(
        line: string,
        controller: TransformStreamDefaultController<Json>
      ) {
        // Here, we _want_ JSON.parse() to throw if its input is invalid
        const json = JSON.parse(line) as J;
        controller.enqueue(json);
      },
    });
  }
}
