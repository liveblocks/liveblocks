import prompts from "prompts";
import c from "ansi-colors";

export function pasteCodePrompt(callback: (data: any) => void) {
  promptForCode();
  function promptForCode() {
    prompts(
      [
        {
          type: "text",
          message: "Paste code from liveblocks.io",
          name: "codeResponse",
        },
      ],
      {
        onCancel() {
          console.log(c.redBright.bold("Cancelled"));
          console.log();
          process.exit(0);
        },
      }
    ).then((promptResponse) => {
      let result;
      try {
        result = JSON.parse(promptResponse.codeResponse.trim());
        callback(result);
      } catch (err) {
        console.log(c.redBright.bold("Invalid code: Must be JSON, try again."));
        promptForCode();
      }
    });
  }
}
