// Procedural moon app icon → valid PNG, no external assets, no deps.
import zlib from 'node:zlib';
import fs from 'node:fs';

function png(size, path) {
  const W = size, H = size;
  const buf = Buffer.alloc(W * H * 4);
  const cx = W * 0.42, cy = H * 0.42, R = W * 0.36;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // background midnight
      let r = 10, g = 14, b = 26, a = 255;
      const d = Math.hypot(x - W/2, y - H/2);
      // soft violet vignette glow
      const gl = Math.max(0, 1 - d / (W*0.7));
      r += gl * 18; g += gl * 10; b += gl * 30;
      // moon disc with soft edge
      const dm = Math.hypot(x - cx, y - cy);
      const edge = 1 - Math.min(1, Math.max(0, (dm - (R-2)) / 3));
      if (dm < R + 2) {
        const shade = 0.82 + 0.18 * ((cx - x) / R); // subtle terminator
        const mr = 233 * shade, mg = 240 * shade, mb = 251 * shade;
        r = r * (1 - edge) + mr * edge;
        g = g * (1 - edge) + mg * edge;
        b = b * (1 - edge) + mb * edge;
      }
      // faint halo
      const halo = Math.max(0, 1 - Math.abs(dm - R) / (R*0.9)) * 0.15;
      r += halo * 120; g += halo * 140; b += halo * 180;
      buf[i] = Math.min(255, r); buf[i+1] = Math.min(255, g); buf[i+2] = Math.min(255, b); buf[i+3] = a;
    }
  }
  // encode PNG (filter 0 each row)
  const raw = Buffer.alloc(H * (W * 4 + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (W*4+1)] = 0;
    buf.copy(raw, y*(W*4+1)+1, y*W*4, y*W*4 + W*4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  fs.writeFileSync(path, Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]));
}
function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return ~c;}
png(192, 'public/icon-192.png');
png(512, 'public/icon-512.png');
console.log('icons written');
