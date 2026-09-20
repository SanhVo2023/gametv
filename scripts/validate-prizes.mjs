/**
 * Checks that the three places a gift is declared stay in sync:
 *   - gas/Code.gs            DEFAULT_PRIZES seed (id + name)
 *   - lib/prizeImages.ts     id → /present photo map
 *   - components/PrizeMarquee.tsx  FALLBACK list shown before the sheet answers
 * and that every mapped photo is a transparent RGBA PNG on disk.
 *
 *   node scripts/validate-prizes.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const gas = readFileSync("gas/Code.gs", "utf8");
const images = readFileSync("lib/prizeImages.ts", "utf8");
const marquee = readFileSync("components/PrizeMarquee.tsx", "utf8");

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const seedBlock = gas.slice(gas.indexOf("var DEFAULT_PRIZES"), gas.indexOf("];", gas.indexOf("var DEFAULT_PRIZES")));
const seed = [...seedBlock.matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)/g)].map(
  ([, id, name, stock, weight]) => ({ id, name, stock: Number(stock), weight: Number(weight) }),
);
expect(seed.length > 0, "no DEFAULT_PRIZES rows found in gas/Code.gs");

const imageBlock = images.slice(images.indexOf("const PRIZE_IMAGES"), images.indexOf("};", images.indexOf("const PRIZE_IMAGES")));
const imageMap = new Map(
  [...imageBlock.matchAll(/^\s*"?([A-Za-z0-9_-]+)"?\s*:\s*"([^"]+)"/gm)].map(([, id, src]) => [id, src]),
);
expect(imageMap.size > 0, "no PRIZE_IMAGES entries found in lib/prizeImages.ts");

const fallbackBlock = marquee.slice(marquee.indexOf("const FALLBACK"), marquee.indexOf("];", marquee.indexOf("const FALLBACK")));
const fallback = new Map(
  [...fallbackBlock.matchAll(/id:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map(([, id, name]) => [id, name]),
);
expect(fallback.size > 0, "no FALLBACK entries found in components/PrizeMarquee.tsx");

const isVoucher = (id) => /voucher/i.test(id);

for (const row of seed) {
  expect(row.stock > 0 && row.weight > 0, `${row.id}: seed stock/weight must be > 0`);
  if (isVoucher(row.id)) continue;
  expect(imageMap.has(row.id), `${row.id}: seeded in Code.gs but has no photo in lib/prizeImages.ts`);
  expect(fallback.has(row.id), `${row.id}: seeded in Code.gs but missing from the marquee FALLBACK list`);
  if (fallback.has(row.id)) expect(fallback.get(row.id) === row.name, `${row.id}: marquee name "${fallback.get(row.id)}" ≠ seed name "${row.name}"`);
}
const seedIds = new Set(seed.map((r) => r.id));
for (const id of imageMap.keys()) expect(seedIds.has(id), `${id}: has a photo but is not in the Code.gs seed`);
for (const id of fallback.keys()) expect(seedIds.has(id), `${id}: in the marquee FALLBACK list but not in the Code.gs seed`);

function readRgbaPng(path) {
  const buf = readFileSync(path);
  expect(buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${path} is not a PNG`);
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    offset += 12 + length;
  }
  if (!(bitDepth === 8 && colorType === 6)) return { width, height, pixels: null, bitDepth, colorType };
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const pixels = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const row = raw.subarray(src, src + stride);
    src += stride;
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? out[x - bpp] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= bpp ? prev[x - bpp] : 0;
      let value = row[x];
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        value = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }
      out[x] = value;
    }
  }
  return { width, height, pixels };
}

for (const [id, src] of imageMap) {
  const path = `public${src}`;
  if (!existsSync(path)) {
    failures.push(`${id}: photo ${path} does not exist`);
    continue;
  }
  const png = readRgbaPng(path);
  if (!png.pixels) {
    failures.push(`${id}: ${path} must be an 8-bit RGBA PNG (transparent background)`);
    continue;
  }
  expect(png.width <= 1200 && png.height <= 1200, `${id}: ${path} is ${png.width}×${png.height}; keep photos ≤1200 px for the kiosk`);
  const alphaAt = (x, y) => png.pixels[(y * png.width + x) * 4 + 3];
  const corners = [alphaAt(0, 0), alphaAt(png.width - 1, 0), alphaAt(0, png.height - 1), alphaAt(png.width - 1, png.height - 1)];
  expect(corners.every((a) => a === 0), `${id}: ${path} corners must be transparent`);
  let opaque = 0;
  for (let i = 3; i < png.pixels.length; i += 4) if (png.pixels[i] >= 250) opaque++;
  expect(opaque > 1000, `${id}: ${path} has no opaque subject pixels`);
}

if (failures.length > 0) {
  console.error(failures.map((f) => `- ${f}`).join("\n"));
  process.exit(1);
}
console.log(`Prize config OK: ${seed.length} wedges, ${imageMap.size} photos, marquee fallback in sync.`);
