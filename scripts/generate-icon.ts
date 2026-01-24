import sharp from "sharp";
import { mkdirSync } from "node:fs";

const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

async function generateIcons() {
  mkdirSync("public", { recursive: true });

  for (const { name, size } of sizes) {
    const fontSize = Math.round(size * 0.6);
    const borderRadius = Math.round(size * 0.15);

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${borderRadius}" ry="${borderRadius}" fill="#030712"/>
        <text
          x="50%"
          y="50%"
          dominant-baseline="central"
          text-anchor="middle"
          fill="white"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="${fontSize}px"
          font-weight="700"
        >D</text>
      </svg>
    `;

    await sharp(Buffer.from(svg)).png().toFile(`public/${name}`);

    console.log(`Generated: public/${name}`);
  }

  console.log("Done!");
}

generateIcons();
