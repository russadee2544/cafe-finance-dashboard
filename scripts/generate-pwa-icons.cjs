const fs = require('fs');

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="42" fill="#181A1C"/>
  <path d="M40 96 L70 96 L85 50 L100 140 L115 80 L130 96 L150 96" stroke="#D2E875" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#181A1C"/>
  <path d="M100 256 L180 256 L220 140 L260 370 L300 210 L340 256 L380 256" stroke="#D2E875" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

fs.writeFileSync('public/pwa-192.svg', svg192);
fs.writeFileSync('public/pwa-512.svg', svg512);
fs.writeFileSync('public/apple-touch-icon.png', svg192);
console.log('PWA SVG Icons created successfully!');
