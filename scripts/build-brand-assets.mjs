import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Package the approved artwork at application sizes without changing its design.
const source = await readFile(new URL('../public/brand/blockos-source.png', import.meta.url));
const sizes = [16, 32, 48, 64, 180, 192, 256, 512];
const images = new Map();
for (const size of sizes) {
  const png = await sharp(source).resize(size, size).png().toBuffer();
  images.set(size, png);
  await writeFile(new URL('../public/brand/blockos-icon-' + size + '.png', import.meta.url), png);
}

// ICO supports PNG payloads. Include common browser and desktop sizes.
const icoSizes = [16, 32, 48, 256];
const header = Buffer.alloc(6 + icoSizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
for (const [index, size] of icoSizes.entries()) {
  const image = images.get(size);
  const entry = 6 + index * 16;
  header[entry] = size === 256 ? 0 : size;
  header[entry + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
}
await writeFile(new URL('../src/app/favicon.ico', import.meta.url), Buffer.concat([header, ...icoSizes.map(size => images.get(size))]));
const encoded = images.get(64).toString('base64');
await writeFile(new URL('../public/favicon.svg', import.meta.url), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,' + encoded + '"/></svg>\n');
console.log('Packaged approved BlockOS icon: PNG sizes, ICO and legacy SVG.');
