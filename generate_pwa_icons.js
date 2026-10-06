import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

function createIconPNG(size, paddingPercent = 0) {
  const png = new PNG({ width: size, height: size });

  const bgR = 4, bgG = 18, bgB = 9; // Dark emerald black #041209
  const borderR = 0, borderG = 166, borderB = 81; // Green #00A651
  const goldR = 255, goldG = 226, goldB = 89; // Gold #FFE259

  const pad = Math.floor(size * paddingPercent);
  const effectiveSize = size - pad * 2;
  const radius = Math.floor(effectiveSize * 0.22);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Outer background
      png.data[idx] = bgR;
      png.data[idx + 1] = bgG;
      png.data[idx + 2] = bgB;
      png.data[idx + 3] = 255;

      // Inside padded safe box
      if (x >= pad && x < size - pad && y >= pad && y < size - pad) {
        const nx = x - pad;
        const ny = y - pad;

        // Border check
        const isBorder =
          nx < 8 || nx >= effectiveSize - 8 || ny < 8 || ny >= effectiveSize - 8;

        if (isBorder) {
          png.data[idx] = borderR;
          png.data[idx + 1] = borderG;
          png.data[idx + 2] = borderB;
          png.data[idx + 3] = 255;
        } else {
          // Center emblem circle
          const cx = effectiveSize / 2;
          const cy = effectiveSize / 2;
          const dx = nx - cx;
          const dy = ny - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < effectiveSize * 0.3) {
            png.data[idx] = borderR;
            png.data[idx + 1] = borderG;
            png.data[idx + 2] = borderB;
            png.data[idx + 3] = 255;
          }

          // Play triangle in center
          if (dx > -effectiveSize * 0.08 && dx < effectiveSize * 0.12 && Math.abs(dy) < (dx + effectiveSize * 0.08) * 0.8) {
            png.data[idx] = goldR;
            png.data[idx + 1] = goldG;
            png.data[idx + 2] = goldB;
            png.data[idx + 3] = 255;
          }
        }
      }
    }
  }

  return PNG.sync.write(png);
}

const publicDir = path.resolve('public');

// 1. pwa-192x192.png
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createIconPNG(192));
console.log('Created public/pwa-192x192.png');

// 2. pwa-512x512.png
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createIconPNG(512));
console.log('Created public/pwa-512x512.png');

// 3. pwa-maskable-512x512.png (with 15% safe zone padding)
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createIconPNG(512, 0.15));
console.log('Created public/pwa-maskable-512x512.png');

// 4. apple-touch-icon.png (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createIconPNG(180));
console.log('Created public/apple-touch-icon.png');
