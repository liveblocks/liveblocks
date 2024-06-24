import prompts, { PromptObject } from "prompts";
import c from "ansi-colors";

export type ConfigFrameworks = "react" | "javascript";

export type InitQuestions = {
  framework: ConfigFrameworks;
};

export async function initPrompts(flags: Record<string, any>) {
  // === Configure by asking prompts, questions skipped if flags exist ===
  const questions: PromptObject<keyof InitQuestions>[] = [
    {
      type: flags.framework ? null : "select",
      name: "framework",
      message: `Which framework are you using?`,
      choices: [
        { title: "React", value: "react" },
        { title: "Other JavaScript", value: "javascript" },
      ],
      initial: 0,
    },
  ];

  // === Prompt return values, using flags as defaults ===================
  const { framework = flags.framework }: InitQuestions = await prompts(
    questions,
    {
      onCancel: () => {
        console.log(c.redBright.bold("  Cancelled"));
        console.log();
        process.exit(0);
      },
    }
  );

  return { framework };
}
