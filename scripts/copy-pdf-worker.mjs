import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const destDir = resolve(process.cwd(), "public");
const dest = resolve(destDir, "pdf.worker.min.mjs");
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
