import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const files = {
  gas: readFileSync("gas/Code.gs", "utf8"),
  images: readFileSync("lib/prizeImages.ts", "utf8"),
  marquee: readFileSync("components/PrizeMarquee.tsx", "utf8"),
  landing: readFileSync("components/screens/LandingScreen.tsx", "utf8"),
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

function readRgbaPng(path) {
  const buf = readFileSync(path);
  expect(buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${path} is not a PNG`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
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
  expect(bitDepth === 8 && colorType === 6, `${path} must be 8-bit RGBA PNG`);
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
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }
      out[x] = value;
    }
  }
  return { width, height, pixels };
}

expect(files.landing.includes("DIAmond Palza \u2014 17/07/2026"), "landing event place/date is not updated");
expect(files.images.includes('HOPKINH: "/present/hop-kinh.png"'), "new HOPKINH transparent PNG is not mapped");
expect(files.marquee.includes('{ id: "HOPKINH", name: "H\u1ed9p k\u00ednh" }'), "new HOPKINH prize is not in fallback marquee");
expect(files.marquee.includes("const supplemental = FALLBACK.filter"), "main page marquee must supplement live prizes with fallback gifts");

const png = readRgbaPng("public/present/hop-kinh.png");
const alphaAt = (x, y) => png.pixels[(y * png.width + x) * 4 + 3];
expect([alphaAt(0, 0), alphaAt(png.width - 1, 0), alphaAt(0, png.height - 1), alphaAt(png.width - 1, png.height - 1)].every((a) => a === 0), "HOPKINH PNG corners must be transparent");
let opaquePixels = 0;
for (let i = 3; i < png.pixels.length; i += 4) if (png.pixels[i] >= 250) opaquePixels++;
expect(opaquePixels > 1000, "HOPKINH PNG must contain opaque subject pixels");

const prizeRows = [...files.gas.matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)/g)].map(
  ([, id, name, stock, weight]) => ({
    id,
    name,
    stock: Number(stock),
    weight: Number(weight),
  }),
);

const voucher200Rows = prizeRows.filter((row) => row.id.startsWith("VOUCHER200K"));
const voucherRows = prizeRows.filter((row) => row.id.startsWith("VOUCHER"));
const presentRows = prizeRows.filter((row) => !row.id.startsWith("VOUCHER"));

expect(prizeRows.some((row) => row.id === "HOPKINH"), "HOPKINH is not seeded as a prize");
expect(voucher200Rows.length === 1, "exactly one 200k voucher wedge should remain");
expect(voucherRows.length > 0 && voucherRows.every((row) => row.stock === 100 && row.weight === 20), "voucher rows must use stock 100 and weight 20");
expect(presentRows.length > 0 && presentRows.every((row) => row.stock === 10 && row.weight === 10), "present rows must use stock 10 and weight 10");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Prize event config OK: ${presentRows.length} presents, ${voucherRows.length} voucher wedges.`);