import esbuild from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");

const outDir = join(__dirname, "dist");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2020",
  outfile: join(outDir, "main.js"),
  external: ["obsidian"],
  logLevel: "info",
});

if (isWatch) {
  await ctx.watch();
  copyFileSync(join(__dirname, "manifest.json"), join(outDir, "manifest.json"));
  copyFileSync(join(__dirname, "styles.css"), join(outDir, "styles.css"));
  console.log("Watching... Copy manifest.json and styles.css to dist/");
} else {
  await ctx.rebuild();
  copyFileSync(join(__dirname, "manifest.json"), join(outDir, "manifest.json"));
  copyFileSync(join(__dirname, "styles.css"), join(outDir, "styles.css"));
  console.log("Build done. Output: dist/main.js, dist/manifest.json, dist/styles.css");
}

ctx.dispose();
