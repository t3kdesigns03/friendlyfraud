// Bakes the crest artwork into a transparent image for the site.
//   npm run crest
// The pixels are the artwork's own, untouched. Only the alpha is made:
//  - inside the traced shield silhouette (spikes and crystals included): fully opaque
//  - outside it: smoke and embers keep their own light (luminance key, radial falloff)
//  - the near-black backdrop goes clear
import sharp from "sharp";

const SRC = "assets/crest-source.webp"; // the original 1600×1600 artwork
const SIZE = 1024;

// Shield outline in source (1600px) coordinates, traced from the artwork.
const SHIELD = [
  [138, 286], [300, 222], [470, 158], [640, 92], [800, 32], [960, 92], [1110, 150], [1290, 205], [1452, 250],
  [1462, 420], [1450, 600], [1440, 790], [1405, 960], [1350, 1060], [1260, 1200], [1150, 1320], [1020, 1440],
  [900, 1515], [800, 1560], [690, 1510], [560, 1440], [440, 1350], [340, 1255], [260, 1140], [215, 1020],
  [180, 880], [158, 760], [146, 640], [140, 520], [136, 400],
];

const k = SIZE / 1600;
const pts = SHIELD.map(([x, y]) => `${(x * k).toFixed(1)},${(y * k).toFixed(1)}`).join(" ");
const maskSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="100%" height="100%" fill="black"/><polygon points="${pts}" fill="white"/></svg>`,
);

const rgb = await sharp(SRC).resize(SIZE, SIZE).removeAlpha().raw().toBuffer();
const mask = await sharp(maskSvg).blur(2.2).greyscale().raw().toBuffer();

const out = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x;
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const lum = Math.max(r, g, b) / 255;
    let key = Math.min(1, Math.max(0, (lum - 0.09) / (0.4 - 0.09)));
    key = key * key * (3 - 2 * key);
    const dx = x / SIZE - 0.5, dy = y / SIZE - 0.5;
    const d = Math.hypot(dx, dy);
    const radial = 1 - Math.min(1, Math.max(0, (d - 0.42) / (0.56 - 0.42)));
    const a = Math.max(mask[i] / 255, key * radial);
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = Math.round(a * 255);
  }
}

await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } }).webp({ quality: 90, alphaQuality: 90 }).toFile("public/crest-art.webp");
// header mark: the shield itself, square-cropped
await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .extract({ left: Math.round(80 * k), top: Math.round(10 * k), width: Math.round(1440 * k), height: Math.round(1440 * k) })
  .resize(128, 128)
  .webp({ quality: 92 })
  .toFile("public/crest-mark.webp");
console.log("wrote public/crest-art.webp and public/crest-mark.webp");
