const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crc.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createPng(width, height, pixelFn) {
  // RGBA buffer with 1 filter byte per line
  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(raw));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Generate 1024x1024 Catchy ACCA icon
const size = 1024;
const pngBuf = createPng(size, size, (x, y, w, h) => {
  // Center coordinates (-1 to 1)
  const cx = (x - w / 2) / (w / 2);
  const cy = (y - h / 2) / (h / 2);

  // Rounded squircle mask: (|cx|^4 + |cy|^4) <= 0.85
  const dist = Math.pow(Math.abs(cx), 4.2) + Math.pow(Math.abs(cy), 4.2);
  if (dist > 0.88) {
    return [0, 0, 0, 0]; // Transparent outer edge
  }

  // Outer border anti-aliasing
  if (dist > 0.85) {
    return [30, 30, 38, 200];
  }

  // Base canvas: Deep Charcoal (#141419 to #1c1c24 gradient)
  let r = 20 + Math.floor((1 - cy) * 6);
  let g = 20 + Math.floor((1 - cy) * 6);
  let b = 25 + Math.floor((1 - cy) * 8);
  let a = 255;

  // Red ACCA emblem square in center: -0.55 <= cx <= 0.55, -0.55 <= cy <= 0.55
  const emDist = Math.pow(Math.abs(cx / 0.58), 4.0) + Math.pow(Math.abs(cy / 0.58), 4.0);
  if (emDist <= 1.0) {
    // ACCA Red (#dc2626 to #b91c1c gradient)
    r = 220 - Math.floor((cy + 0.5) * 35);
    g = 38 - Math.floor((cy + 0.5) * 10);
    b = 38 - Math.floor((cy + 0.5) * 10);

    // Subtle inner border
    if (emDist > 0.94) {
      r = Math.min(255, r + 40);
      g = Math.min(255, g + 20);
      b = Math.min(255, b + 20);
    }

    // Stylized "CA" Monogram in White
    // "C" on left (-0.35 to -0.05), "A" on right (0.05 to 0.35), vertical -0.28 to 0.28
    const inC = (
      (Math.abs(cx - (-0.20)) < 0.16 && Math.abs(cy) < 0.26) &&
      !(Math.abs(cx - (-0.16)) < 0.08 && Math.abs(cy) < 0.16) &&
      !(cx > -0.12 && Math.abs(cy) < 0.10)
    );

    const inA = (
      // Left leg
      (Math.abs((cy - (-0.26)) / 0.52 * 0.15 - (0.20 - cx)) < 0.045 && cy > -0.26 && cy < 0.26) ||
      // Right leg
      (Math.abs((cy - (-0.26)) / 0.52 * 0.15 - (cx - 0.20)) < 0.045 && cy > -0.26 && cy < 0.26) ||
      // Crossbar
      (Math.abs(cy - 0.06) < 0.04 && cx > 0.10 && cx < 0.30)
    );

    if (inC || inA) {
      r = 255;
      g = 255;
      b = 255;
    }
  }

  return [r, g, b, a];
});

const buildDir = path.join(__dirname, '../build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const pngPath = path.join(buildDir, 'icon.png');
fs.writeFileSync(pngPath, pngBuf);
console.log('Generated build/icon.png (1024x1024)');

// Generate macOS iconset and ICNS using built-in sips and iconutil
try {
  const iconsetDir = path.join(buildDir, 'icon.iconset');
  if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [16, 32, 64, 128, 256, 512];
  for (const s of sizes) {
    execSync(`sips -z ${s} ${s} "${pngPath}" --out "${path.join(iconsetDir, `icon_${s}x${s}.png`)}"`, { stdio: 'ignore' });
    execSync(`sips -z ${s * 2} ${s * 2} "${pngPath}" --out "${path.join(iconsetDir, `icon_${s}x${s}@2x.png`)}"`, { stdio: 'ignore' });
  }

  execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(buildDir, 'icon.icns')}"`, { stdio: 'inherit' });
  console.log('Generated build/icon.icns');

  // Generate 256x256 PNG for ICO
  const png256Path = path.join(iconsetDir, 'icon_256x256.png');
  const png256Buf = fs.readFileSync(png256Path);

  // Microsoft ICO Header wrapping 256x256 PNG
  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 Image
  icoHeader.writeUInt8(0, 6); // Width 256 (0 means 256)
  icoHeader.writeUInt8(0, 7); // Height 256 (0 means 256)
  icoHeader.writeUInt8(0, 8); // Color count 0 (no palette)
  icoHeader.writeUInt8(0, 9); // Reserved
  icoHeader.writeUInt16LE(1, 10); // Color planes
  icoHeader.writeUInt16LE(32, 12); // Bits per pixel
  icoHeader.writeUInt32LE(png256Buf.length, 14); // Size of image data
  icoHeader.writeUInt32LE(22, 18); // Offset of image data (header length = 22)

  const validIcoBuf = Buffer.concat([icoHeader, png256Buf]);
  const icoPath = path.join(buildDir, 'icon.ico');
  fs.writeFileSync(icoPath, validIcoBuf);
  console.log('Generated valid build/icon.ico with 256x256 PNG payload');
} catch (e) {
  console.warn('macOS icon utility step note:', e.message);
}
