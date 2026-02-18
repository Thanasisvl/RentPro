/**
 * Downloads house / building photos into public/img/properties/.
 * Uses Lorem Flickr with tags "house,building" so all images are house-related.
 *
 * Run once (with network):  npm run download-property-images
 * Then restart or refresh the app.
 */

const fs = require("fs");
const path = require("path");

const COUNT = 10;
const W = 400;
const H = 280;
const OUT_DIR = path.join(__dirname, "..", "public", "img", "properties");

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("Downloading", COUNT, "house/building images to", OUT_DIR);

  for (let i = 1; i <= COUNT; i++) {
    const seed = "rentpro-house-" + i;
    const url = `https://loremflickr.com/${W}/${H}/house,building?lock=${i}`;
    const outPath = path.join(OUT_DIR, `${i}.jpg`);
    try {
      const buf = await download(url);
      fs.writeFileSync(outPath, buf);
      console.log("  OK", i + "/" + COUNT, outPath);
    } catch (e) {
      console.error("  FAIL", i, url, e.message);
    }
  }

  console.log("Done. Restart or refresh the app to see the house images.");
}

main();
