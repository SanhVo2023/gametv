// Regenerates public/company-show from the operator's full-resolution photos
// in public/company (untracked, 6–21 MB each — the kiosk must never load them).
// Run from the repo root: node scripts/resize-company.mjs
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

const SRC = path.resolve("public", "company");
const OUT = path.resolve("public", "company-show");

// source file → kiosk-safe copy (referenced by COMPANY_SLIDES in lib/showcase.ts)
const MAP = [
  ["1. 5 - 10 năm.JPG", "tenure-5-10.jpg"],
  ["2. 15 năm.JPG", "tenure-15.jpg"],
  ["3. Trân 15 năm.JPG", "tenure-over-15.jpg"],
  ["4.1.JPG", "party-1.jpg"],
  ["4.2.JPG", "party-2.jpg"],
  ["4.3 (2).JPG", "party-3.jpg"],
  ["4.5.JPG", "party-4.jpg"],
  ["4.6.JPG", "party-5.jpg"],
  ["5.1.JPG", "daily-1.jpg"],
  ["5.2.JPG", "daily-2.jpg"],
  ["5.3.JPG", "daily-3.jpg"],
  ["5.4.JPG", "daily-4.jpg"],
  ["5.5.JPG", "daily-5.jpg"],
  ["6.1.JPG", "best-1.jpg"],
  ["6.2.JPG", "best-2.jpg"],
  ["6.3.JPG", "best-3.jpg"],
  ["7.1.JPG", "training-1.jpg"],
  ["7.2.JPG", "training-2.jpg"],
  ["7.3.JPG", "training-3.jpg"],
  ["7.4.JPG", "training-4.jpg"],
  ["8.1.jpg", "charity-1.jpg"],
  ["8.2.jpg", "charity-2.jpg"],
  ["8.3.jpg", "charity-3.jpg"],
  ["8.4.JPG", "charity-4.jpg"],
];

fs.mkdirSync(OUT, { recursive: true });
for (const [src, out] of MAP) {
  const outPath = path.join(OUT, out);
  const info = await sharp(path.join(SRC, src))
    .rotate() // honor EXIF orientation
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(outPath);
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`${out}  ${info.width}x${info.height}  ${kb} KB`);
}
