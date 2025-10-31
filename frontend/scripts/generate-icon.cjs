#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const sizes = [256, 128, 64, 32, 16];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawIcon(size) {
  const data = new Uint8Array(size * size * 4);

  const topColor = [12, 39, 70];
  const bottomColor = [24, 78, 128];

  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(lerp(topColor[0], bottomColor[0], t));
    const g = Math.round(lerp(topColor[1], bottomColor[1], t));
    const b = Math.round(lerp(topColor[2], bottomColor[2], t));
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  const gridLinesX = [0.28, 0.5, 0.72];
  const gridLinesY = [0.38, 0.58, 0.78];
  const gridThickness = 1.5 / size;
  const gridColor = [48, 115, 190];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;

      let draw = false;
      for (const gx of gridLinesX) {
        if (Math.abs(nx - gx) < gridThickness) {
          draw = true;
          break;
        }
      }
      if (!draw) {
        for (const gy of gridLinesY) {
          if (Math.abs(ny - gy) < gridThickness) {
            draw = true;
            break;
          }
        }
      }
      if (draw) {
        const idx = (y * size + x) * 4;
        data[idx] = gridColor[0];
        data[idx + 1] = gridColor[1];
        data[idx + 2] = gridColor[2];
        data[idx + 3] = 255;
      }
    }
  }

  const squareColor = [118, 208, 255];
  const squareSize = 0.08;
  const squares = [
    [0.28, 0.34],
    [0.5, 0.58],
    [0.74, 0.78],
  ];
  for (const [cx, cy] of squares) {
    for (let y = 0; y < size; y++) {
      const ny = (y + 0.5) / size;
      if (Math.abs(ny - cy) > squareSize / 2) continue;
      for (let x = 0; x < size; x++) {
        const nx = (x + 0.5) / size;
        if (Math.abs(nx - cx) > squareSize / 2) continue;
        const idx = (y * size + x) * 4;
        data[idx] = squareColor[0];
        data[idx + 1] = squareColor[1];
        data[idx + 2] = squareColor[2];
        data[idx + 3] = 255;
      }
    }
  }

  const headColor = [255, 226, 176];
  const headOutline = [241, 195, 123];
  const headCenter = [0.5, 0.35];
  const headRadius = 0.14;
  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5) / size;
    const dy = ny - headCenter[1];
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const dx = nx - headCenter[0];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= headRadius) {
        const idx = (y * size + x) * 4;
        const outlineFactor = Math.max(0, 1 - (headRadius - dist) * size * 0.8);
        data[idx] = Math.round(
          headColor[0] * (1 - outlineFactor) + headOutline[0] * outlineFactor,
        );
        data[idx + 1] = Math.round(
          headColor[1] * (1 - outlineFactor) + headOutline[1] * outlineFactor,
        );
        data[idx + 2] = Math.round(
          headColor[2] * (1 - outlineFactor) + headOutline[2] * outlineFactor,
        );
        data[idx + 3] = 255;
      }
    }
  }

  const bodyColor = [77, 179, 240];
  const bodyShade = [34, 112, 202];
  const bodyCenter = [0.5, 0.68];
  const bodyRx = 0.26;
  const bodyRy = 0.24;
  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5) / size;
    const dy = (ny - bodyCenter[1]) / bodyRy;
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const dx = (nx - bodyCenter[0]) / bodyRx;
      if (dx * dx + dy * dy <= 1 && ny > headCenter[1]) {
        const shade = Math.max(0, Math.min(1, (ny - bodyCenter[1]) * 3 + 0.3));
        const idx = (y * size + x) * 4;
        data[idx] = Math.round(
          bodyColor[0] * (1 - shade) + bodyShade[0] * shade,
        );
        data[idx + 1] = Math.round(
          bodyColor[1] * (1 - shade) + bodyShade[1] * shade,
        );
        data[idx + 2] = Math.round(
          bodyColor[2] * (1 - shade) + bodyShade[2] * shade,
        );
        data[idx + 3] = 255;
      }
    }
  }

  const highlightColor = [255, 255, 255];
  const highlightCenter = [0.58, 0.31];
  const highlightRadius = 0.05;
  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5) / size;
    const dy = ny - highlightCenter[1];
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const dx = nx - highlightCenter[0];
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= highlightRadius * highlightRadius) {
        const idx = (y * size + x) * 4;
        const falloff = 1 - dist2 / (highlightRadius * highlightRadius);
        data[idx] = Math.round(
          highlightColor[0] * falloff + data[idx] * (1 - falloff),
        );
        data[idx + 1] = Math.round(
          highlightColor[1] * falloff + data[idx + 1] * (1 - falloff),
        );
        data[idx + 2] = Math.round(
          highlightColor[2] * falloff + data[idx + 2] * (1 - falloff),
        );
        data[idx + 3] = 255;
      }
    }
  }

  const edgeColor = [9, 27, 48];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x < 2 || x >= size - 2 || y < 2 || y >= size - 2) {
        const idx = (y * size + x) * 4;
        data[idx] = edgeColor[0];
        data[idx + 1] = edgeColor[1];
        data[idx + 2] = edgeColor[2];
        data[idx + 3] = 255;
      }
    }
  }

  return data;
}

function createIco() {
  const images = sizes.map((size) => {
    const pixels = drawIcon(size);
    const rowSize = size * 4;
    const imageData = Buffer.alloc(rowSize * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcIndex = (y * size + x) * 4;
        const destIndex = ((size - 1 - y) * size + x) * 4;
        imageData[destIndex] = pixels[srcIndex + 2];
        imageData[destIndex + 1] = pixels[srcIndex + 1];
        imageData[destIndex + 2] = pixels[srcIndex];
        imageData[destIndex + 3] = pixels[srcIndex + 3];
      }
    }

    const maskRowSize = Math.ceil(size / 32) * 4;
    const andMask = Buffer.alloc(maskRowSize * size);

    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0);
    header.writeInt32LE(size, 4);
    header.writeInt32LE(size * 2, 8);
    header.writeUInt16LE(1, 12);
    header.writeUInt16LE(32, 14);
    header.writeUInt32LE(0, 16);
    header.writeUInt32LE(imageData.length, 20);
    header.writeInt32LE(0, 24);
    header.writeInt32LE(0, 28);
    header.writeUInt32LE(0, 32);
    header.writeUInt32LE(0, 36);

    const bitmap = Buffer.concat([header, imageData, andMask]);

    return {
      size,
      bitmap,
    };
  });

  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);
  iconDir.writeUInt16LE(1, 2);
  iconDir.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = iconDir.length + images.length * 16;

  for (const { size, bitmap } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(bitmap.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += bitmap.length;
    entries.push(entry);
  }

  const icoBuffer = Buffer.concat([
    iconDir,
    ...entries,
    ...images.map((img) => img.bitmap),
  ]);

  const assetsDir = path.resolve(__dirname, '..', 'electron', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, 'app-icon.ico'), icoBuffer);
}

createIco();
