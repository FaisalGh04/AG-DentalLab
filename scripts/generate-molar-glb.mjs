import * as THREE from "three";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createMolarGeometry } from "./molar-geometry.mjs";

const OUTPUT_PATH = resolve("public/models/molar-lowpoly.glb");

function pad4(buffer, fill = 0x00) {
  const pad = (4 - (buffer.byteLength % 4)) % 4;
  if (pad === 0) return Buffer.from(buffer);
  return Buffer.concat([Buffer.from(buffer), Buffer.alloc(pad, fill)]);
}

function computeMinMax(typed, stride = 3) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < typed.length; i += stride) {
    for (let j = 0; j < stride; j += 1) {
      const v = typed[i + j];
      if (v < min[j]) min[j] = v;
      if (v > max[j]) max[j] = v;
    }
  }

  return { min, max };
}

function buildGlb(geometry) {
  geometry.computeVertexNormals();

  const posAttr = geometry.getAttribute("position");
  const nrmAttr = geometry.getAttribute("normal");
  const indexAttr = geometry.getIndex();

  if (!posAttr || !nrmAttr || !indexAttr) {
    throw new Error("Geometry must have position, normal, and index data");
  }

  const positions = new Float32Array(posAttr.array);
  const normals = new Float32Array(nrmAttr.array);
  const maxIndex = Math.max(...indexAttr.array);
  const indices =
    maxIndex > 65535
      ? Uint32Array.from(indexAttr.array)
      : Uint16Array.from(indexAttr.array);

  const posBuf = pad4(Buffer.from(positions.buffer));
  const nrmBuf = pad4(Buffer.from(normals.buffer));
  const idxBuf = pad4(Buffer.from(indices.buffer));

  const posOffset = 0;
  const nrmOffset = posOffset + posBuf.byteLength;
  const idxOffset = nrmOffset + nrmBuf.byteLength;

  const binChunk = Buffer.concat([posBuf, nrmBuf, idxBuf]);
  const { min, max } = computeMinMax(positions, 3);

  const gltf = {
    asset: { version: "2.0", generator: "AG Dental Lab molar generator" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Molar" }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1 },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [0.965, 0.955, 0.915, 1],
          metallicFactor: 0,
          roughnessFactor: 0.36,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
        min,
        max,
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: normals.length / 3,
        type: "VEC3",
      },
      {
        bufferView: 2,
        componentType: indices instanceof Uint32Array ? 5125 : 5123,
        count: indices.length,
        type: "SCALAR",
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: posOffset,
        byteLength: posBuf.byteLength,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: nrmOffset,
        byteLength: nrmBuf.byteLength,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: idxOffset,
        byteLength: idxBuf.byteLength,
        target: 34963,
      },
    ],
    buffers: [{ byteLength: binChunk.byteLength }],
  };

  const json = JSON.stringify(gltf);
  const jsonChunk = pad4(Buffer.from(json, "utf8"), 0x20);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // glTF
  header.writeUInt32LE(2, 4); // version
  header.writeUInt32LE(
    12 + 8 + jsonChunk.byteLength + 8 + binChunk.byteLength,
    8,
  );

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.byteLength, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // JSON

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.byteLength, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // BIN

  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

async function main() {
  const geometry = createMolarGeometry();
  const glb = buildGlb(geometry);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, glb);

  const kb = (glb.byteLength / 1024).toFixed(1);
  console.log(`Generated ${OUTPUT_PATH} (${kb} KB)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
