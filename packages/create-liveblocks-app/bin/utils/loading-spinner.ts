import ora from "ora";
import c from "ansi-colors";

export function loadingSpinner(text?: string, customIcon?: string) {
  const i = customIcon || c.magentaBright("🖱");

  return ora({
    spinner: {
      interval: 80,
      frames: [
        `${i}    `,
        ` ${i}   `,
        `  ${i}  `,
        `   ${i} `,
        `    ${i}`,
        `   ${i} `,
        `  ${i}  `,
        ` ${i}   `,
        `${i}    `,
      ],
    },
    text: text,
  }) as any;
}
