import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import zlib from "node:zlib";
import { createMolarGeometry } from "./molar-geometry.mjs";

// ---------------------------------------------------------------------------
// Tiny CPU rasterizer: no GPU needed. Renders the molar geometry to shaded
// PNGs from several angles so the anatomy can be checked against real molars.
// ---------------------------------------------------------------------------

const W = 560;
const H = 560;
const OUT_DIR = process.argv[2] || ".";

const BG = [248, 246, 239]; // cream background, matches the scene
const BASE = [214, 205, 176]; // ceramic-ish base colour for shading

function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

// Rotate a point about Y then X (view orientation).
function rotate(p, ay, ax) {
  const cy = Math.cos(ay);
  const sy = Math.sin(ay);
  let x = cy * p[0] + sy * p[2];
  let z = -sy * p[0] + cy * p[2];
  let y = p[1];
  const cx = Math.cos(ax);
  const sx = Math.sin(ax);
  const y2 = cx * y - sx * z;
  const z2 = sx * y + cx * z;
  return [x, y2, z2];
}

function renderView(pos, nrm, index, { ay, ax }) {
  const img = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i += 1) {
    img[i * 3] = BG[0];
    img[i * 3 + 1] = BG[1];
    img[i * 3 + 2] = BG[2];
  }
  const depth = new Float32Array(W * H).fill(-Infinity);

  // Transform all vertices and their normals to view space.
  const n = pos.length / 3;
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const vz = new Float32Array(n);
  const nvx = new Float32Array(n);
  const nvy = new Float32Array(n);
  const nvz = new Float32Array(n);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const r = rotate([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], ay, ax);
    vx[i] = r[0];
    vy[i] = r[1];
    vz[i] = r[2];
    const rn = rotate([nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]], ay, ax);
    nvx[i] = rn[0];
    nvy[i] = rn[1];
    nvz[i] = rn[2];
    if (r[0] < minX) minX = r[0];
    if (r[0] > maxX) maxX = r[0];
    if (r[1] < minY) minY = r[1];
    if (r[1] > maxY) maxY = r[1];
  }

  // Fit to frame with margin, uniform scale, centred.
  const margin = 0.12;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = Math.min(
    (W * (1 - margin)) / spanX,
    (H * (1 - margin)) / spanY,
  );
  const cxw = (minX + maxX) / 2;
  const cyw = (minY + maxY) / 2;
  const toScreen = (x, y) => [
    W / 2 + (x - cxw) * scale,
    H / 2 - (y - cyw) * scale, // flip Y (screen y grows downward)
  ];

  const light = normalize([-0.35, 0.55, 0.75]); // upper-front-left

  for (let t = 0; t < index.length; t += 3) {
    const i0 = index[t];
    const i1 = index[t + 1];
    const i2 = index[t + 2];

    // View-space geometric normal.
    const ux = vx[i1] - vx[i0];
    const uy = vy[i1] - vy[i0];
    const uz = vz[i1] - vz[i0];
    const wx = vx[i2] - vx[i0];
    const wy = vy[i2] - vy[i0];
    const wz = vz[i2] - vz[i0];
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;

    if (nz <= 0) continue; // backface (camera looks down +Z in view space)

    const [ax0, ay0] = toScreen(vx[i0], vy[i0]);
    const [ax1, ay1] = toScreen(vx[i1], vy[i1]);
    const [ax2, ay2] = toScreen(vx[i2], vy[i2]);
    const z0 = vz[i0];
    const z1 = vz[i1];
    const z2 = vz[i2];

    const minPX = Math.max(0, Math.floor(Math.min(ax0, ax1, ax2)));
    const maxPX = Math.min(W - 1, Math.ceil(Math.max(ax0, ax1, ax2)));
    const minPY = Math.max(0, Math.floor(Math.min(ay0, ay1, ay2)));
    const maxPY = Math.min(H - 1, Math.ceil(Math.max(ay0, ay1, ay2)));

    const area = (ax1 - ax0) * (ay2 - ay0) - (ax2 - ax0) * (ay1 - ay0);
    if (Math.abs(area) < 1e-6) continue;

    for (let py = minPY; py <= maxPY; py += 1) {
      for (let px = minPX; px <= maxPX; px += 1) {
        const sx = px + 0.5;
        const sy = py + 0.5;
        const w0 =
          ((ax1 - sx) * (ay2 - sy) - (ax2 - sx) * (ay1 - sy)) / area;
        const w1 =
          ((ax2 - sx) * (ay0 - sy) - (ax0 - sx) * (ay2 - sy)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;

        const zv = w0 * z0 + w1 * z1 + w2 * z2;
        const di = py * W + px;
        if (zv <= depth[di]) continue; // camera at +Z: nearer = larger z
        depth[di] = zv;

        // Smooth (interpolated vertex) normal — matches Three.js shading.
        let sn0 = w0 * nvx[i0] + w1 * nvx[i1] + w2 * nvx[i2];
        let sn1 = w0 * nvy[i0] + w1 * nvy[i1] + w2 * nvy[i2];
        let sn2 = w0 * nvz[i0] + w1 * nvz[i1] + w2 * nvz[i2];
        const sl = Math.hypot(sn0, sn1, sn2) || 1;
        sn0 /= sl;
        sn1 /= sl;
        sn2 /= sl;

        const diff = Math.max(0, sn0 * light[0] + sn1 * light[1] + sn2 * light[2]);
        const shade = 0.28 + 0.72 * diff;
        const spec = Math.pow(diff, 22) * 0.5;
        img[di * 3] = Math.min(255, BASE[0] * shade + 255 * spec);
        img[di * 3 + 1] = Math.min(255, BASE[1] * shade + 255 * spec);
        img[di * 3 + 2] = Math.min(255, BASE[2] * shade + 255 * spec);
      }
    }
  }

  return encodePng(img, W, H);
}

// --- Minimal PNG encoder (8-bit RGB) ---------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(rgb, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (stride + 1)] = 0; // no filter
    Buffer.from(rgb.buffer, y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------

async function main() {
  const geometry = createMolarGeometry();
  const pos = geometry.getAttribute("position").array;
  const nrm = geometry.getAttribute("normal").array;
  const index = geometry.getIndex().array;

  const views = [
    { label: "front", ay: 0, ax: 0 },
    { label: "occlusal", ay: 0, ax: Math.PI / 2 }, // looking straight down
    { label: "threequarter", ay: 0.6, ax: 0.35 },
    { label: "side", ay: Math.PI / 2, ax: 0 },
  ];

  for (const view of views) {
    const png = renderView(pos, nrm, index, view);
    const path = resolve(OUT_DIR, `molar-${view.label}.png`);
    await writeFile(path, png);
    console.log(`Wrote ${path}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
