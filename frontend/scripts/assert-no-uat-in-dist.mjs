#!/usr/bin/env node
/**
 * Hard gate: production `dist/` must not contain the internal UAT evaluation form.
 * Run after `npm run build` without VITE_ENABLE_UAT=true.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "..", "dist");

const FORBIDDEN = [
  "takaful_uat",
  "نموذج تقييم القبول",
  "UAT_SECTIONS",
  "uat-", // Vite chunk name pattern when the UAT module is code-split
];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === "ENOENT") {
      throw new Error(`dist/ not found at ${distRoot}. Run \`npm run build\` first.`);
    }
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function main() {
  const hits = [];
  for await (const file of walk(distRoot)) {
    const rel = path.relative(distRoot, file);
    // Filename itself may encode the chunk (e.g. uat-XXXX.js)
    for (const needle of FORBIDDEN) {
      if (rel.includes(needle)) {
        hits.push({ file: rel, needle, where: "path" });
      }
    }
    const info = await stat(file);
    if (info.size === 0) continue;
    // Text-ish assets only
    if (!/\.(js|css|html|json|map|txt|svg)$/i.test(file)) continue;
    const text = await readFile(file, "utf8");
    for (const needle of FORBIDDEN) {
      if (text.includes(needle)) {
        hits.push({ file: rel, needle, where: "content" });
      }
    }
  }

  if (hits.length) {
    console.error("assert-no-uat-in-dist: UAT artifacts found in dist/:\n");
    for (const h of hits) {
      console.error(`  [${h.where}] ${h.file}  contains  ${JSON.stringify(h.needle)}`);
    }
    process.exit(1);
  }

  console.log("assert-no-uat-in-dist: OK — no UAT strings in dist/");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
