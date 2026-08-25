/**
 * مزامنة أصول الهوية من المستودع المركزي designSystemFinal
 * (الحزمة @zaad/design-system لا تُصدّر finalDesignSystemFinal/assets في npm files).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const dsRoot = path.join(frontendRoot, "node_modules", "@zaad/design-system");

function readDsVersion() {
  const versionFile = path.join(dsRoot, "VERSION");
  if (fs.existsSync(versionFile)) {
    return fs.readFileSync(versionFile, "utf8").trim();
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(dsRoot, "package.json"), "utf8"));
  return pkg.version;
}

async function main() {
  const version = readDsVersion().replace(/^v/, "");
  const url =
    `https://raw.githubusercontent.com/asamani092-ux/designSystemFinal/v${version}` +
    `/finalDesignSystemFinal/assets/favicon.png`;
  const destDir = path.join(frontendRoot, "public", "finalDesignSystemFinal", "assets");
  const dest = path.join(destDir, "favicon.png");

  fs.mkdirSync(destDir, { recursive: true });

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[sync-design-assets] تعذّر جلب favicon من ${url} (${res.status})`);
    process.exit(0);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(`[sync-design-assets] favicon v${version} → public/finalDesignSystemFinal/assets/favicon.png`);
}

main().catch((err) => {
  console.warn("[sync-design-assets]", err.message);
  process.exit(0);
});
