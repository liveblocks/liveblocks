import prompts, { PromptObject } from "prompts";
import c from "ansi-colors";

export type ConfigFrameworks = "react" | "javascript";

export type InitQuestions = {
  framework: ConfigFrameworks;
  suspense: boolean;
  typescript: boolean;
  comments: boolean;
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
    {
      type: (prev) => {
        if (flags.framework === "react" && !flags.suspense) {
          return "confirm";
        }

        if (flags.suspense || prev !== "react") {
          return null;
        }

        return "confirm";
      },
      name: "suspense",
      message: "Would you like to use our React Suspense hooks (recommended)?",
      initial: true,
    },
    {
      type: flags.typescript !== undefined ? null : "confirm",
      name: "typescript",
      message: "Are you using TypeScript?",
      initial: true,
    },
  ];

  // === Prompt return values, using flags as defaults ===================
  const {
    framework = flags.framework,
    suspense = flags.suspense,
    typescript = flags.typescript,
    comments = flags.comments,
  }: InitQuestions = await prompts(questions, {
    onCancel: () => {
      console.log(c.redBright.bold("  Cancelled"));
      console.log();
      process.exit(0);
    },
  });

  return { framework, suspense, typescript, comments };
}
