import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const docsDirectory = normalize(join(scriptDirectory, "../.."));
const routesPath = join(docsDirectory, "routes.json");
const routes = JSON.parse(readFileSync(routesPath, "utf8"));
const missingSourceAllowlist = new Set(["/api-reference/liveblocks-python"]);
const paths = new Map();
const failures = [];

function sourceForRoute(route) {
  if (route.file) {
    return join(docsDirectory, "pages", route.file.replace(/^\/+/, ""));
  }

  if (route.path === "/") {
    return join(docsDirectory, "pages", "index.mdx");
  }

  return join(docsDirectory, "pages", `${route.path.replace(/^\/+/, "")}.mdx`);
}

function visit(route, location) {
  if (route.path) {
    const previousLocation = paths.get(route.path);

    if (previousLocation) {
      failures.push(
        `Duplicate path "${route.path}" at ${location}; first declared at ${previousLocation}`
      );
    } else {
      paths.set(route.path, location);
    }

    if (!missingSourceAllowlist.has(route.path)) {
      const source = sourceForRoute(route);

      if (!existsSync(source)) {
        failures.push(
          `Missing source for "${route.path}" at ${location}: ${source}`
        );
      }
    }
  }

  for (const [index, child] of (route.routes ?? []).entries()) {
    visit(child, `${location}.routes[${index}]`);
  }
}

for (const [index, route] of routes.entries()) {
  visit(route, `routes[${index}]`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${paths.size} documentation routes.`);
}
