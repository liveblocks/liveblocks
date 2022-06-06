import readline from "readline";
import c from "ansi-colors";

export async function askQuestions() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const name: string = await new Promise((res) => {
    rl.question(c.bold("What is your project named? ... "), (nameAnswer) => {
      res(nameAnswer);
    });
  });

  const install: boolean = await new Promise((res) => {
    rl.question(c.bold("Install? (y/n) "), (installAnswer) => {
      const isYes = [...installAnswer.trim()].every(char => char.toLowerCase() === "y");
      res(isYes);
    });
  });

  rl.close();

  return { name, install };
}
