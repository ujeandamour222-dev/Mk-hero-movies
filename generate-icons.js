import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function generatePngIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });

  const bgR = 10, bgG = 10, bgB = 10; // Dark background #0a0a0a
  const borderR = 220, borderG = 38, borderB = 38; // Red #dc2626
  const goldR = 234, goldG = 179, goldB = 8; // Gold #eab308
  const whiteR = 255, whiteG = 255, whiteB = 255;

  const padding = isMaskable ? Math.round(size * 0.15) : Math.round(size * 0.05);
  const center = size / 2;
  const radius = (size / 2) - padding;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Base background
      let r = bgR, g = bgG, b = bgB, a = 255;

      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Outer gold/red ring
      if (dist <= radius && dist >= radius - (size * 0.04)) {
        r = borderR;
        g = borderG;
        b = borderB;
      } else if (dist < radius - (size * 0.04)) {
        // Inner gradient or dark fill
        const fillFactor = 1 - (dist / radius);
        r = Math.min(255, Math.round(bgR + fillFactor * 30));
        g = bgG;
        b = bgB;
      }

      // Draw stylized "MK" text or crown / film play symbol in the center
      // Let's draw a play triangle in gold/white
      const triWidth = radius * 0.7;
      const triHeight = radius * 0.8;
      const triLeft = center - triWidth * 0.35;
      const triRight = center + triWidth * 0.65;
      const triTop = center - triHeight / 2;
      const triBottom = center + triHeight / 2;

      // Triangular bounding test for play icon
      if (x >= triLeft && x <= triRight) {
        const progress = (x - triLeft) / (triRight - triLeft);
        const currentTop = center - (1 - progress) * (triHeight / 2);
        const currentBottom = center + (1 - progress) * (triHeight / 2);

        if (y >= currentTop && y <= currentBottom) {
          // Inner play symbol in vibrant gold/white
          r = goldR;
          g = goldG;
          b = goldB;
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return PNG.sync.write(png);
}

// Generate files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePngIcon(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePngIcon(512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePngIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePngIcon(180));

// SVG icon for standard browsers
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#0a0a0a"/>
  <circle cx="256" cy="256" r="220" fill="#171717" stroke="#dc2626" stroke-width="20"/>
  <path d="M200 150 L360 256 L200 362 Z" fill="#eab308" stroke="#fef08a" stroke-width="10" stroke-linejoin="round"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);

console.log('Successfully generated PWA icon set!');
