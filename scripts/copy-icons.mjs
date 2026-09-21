import { cp, mkdir } from 'node:fs/promises';
const dir = 'dist/nodes/Kraken';
await mkdir(dir, { recursive: true });
await cp('nodes/Kraken/krakenPro.svg', `${dir}/krakenPro.svg`);
