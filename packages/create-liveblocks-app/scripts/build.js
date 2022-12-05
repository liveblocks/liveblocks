import esbuild from "esbuild";
import { esbuildOptions } from "./esbuild.js";

esbuild.build(esbuildOptions).catch(() => process.exit(1));
