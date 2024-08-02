const commonDevCommands = [
  "dev",
  "development",
  "serve",
  "watch",
  "watch-poll",
  "start",
];
const commonBuildCommands = [
  "build",
  "export",
  "prod",
  "production",
  "compile",
];

export function getDevCommand(
  packageJsonScripts: Record<string, string>
): string | null {
  const scriptNames = Object.keys(packageJsonScripts);

  for (const cmd of commonDevCommands) {
    if (scriptNames.includes(cmd)) {
      return cmd;
    }
  }

  return null;
}

export function getBuildCommand(
  packageJsonScripts: Record<string, string>
): string | null {
  const scriptNames = Object.keys(packageJsonScripts);

  for (const cmd of commonBuildCommands) {
    if (scriptNames.includes(cmd)) {
      return cmd;
    }
  }

  return null;
}
