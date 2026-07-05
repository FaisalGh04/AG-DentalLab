import * as THREE from "three";

/**
 * Procedural molar geometry for the hero model.
 *
 * The shape is built from anatomically motivated parts rather than a single
 * deformed sphere so the silhouette reads as a real molar:
 *
 *  - Crown: a superellipsoid (rounded cuboid) so the occlusal view is a
 *    rounded square and the front view is blocky in the upper two-thirds.
 *    Its top is sculpted into four major cusps in two rows plus a smaller
 *    distal cusp, separated by a cross-shaped central fissure.
 *  - Neck: a subtle cervical waist between crown and roots.
 *  - Roots: three separate tapered branches (upper-molar tripod) diverging
 *    downward and outward from the neck.
 *
 * Everything is merged into one indexed BufferGeometry (position + normal),
 * kept lightweight so the exported GLB stays in the same size class.
 */

/** Signed power — keeps the sign of `t` while raising its magnitude. */
function spow(t, e) {
  return Math.sign(t) * Math.pow(Math.abs(t), e);
}

function gauss2(dx, dz, sigma) {
  return Math.exp(-((dx * dx + dz * dz) / sigma));
}

// Crown half-extents. Width (x, mesiodistal) ~= height (y) so the crown is
// blocky, not tall/narrow. Depth (z, buccolingual) is slightly smaller.
const AX = 0.64;
const AY = 0.66;
const AZ = 0.58;
const CROWN_Y = 0.4; // lift the crown so roots hang below the origin
const E1 = 0.45; // vertical rounding (smaller = flatter top / boxier)
const E2 = 0.4; // cross-section rounding (smaller = squarer occlusal view)

/**
 * Crown as a sculpted superellipsoid grid. Returns an indexed BufferGeometry
 * with position + normal.
 */
function createCrown() {
  const latSeg = 80;
  const lonSeg = 80;

  const positions = [];
  const grid = [];
  const push = (x, y, z) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };

  // The superellipsoid collapses to a single point at each pole, so weld those
  // rows to one shared vertex — otherwise the coincident pole vertices each get
  // a different normal and produce a shimmering pinwheel at the occlusal centre.
  let northIdx = -1;
  let southIdx = -1;

  for (let i = 0; i <= latSeg; i += 1) {
    const row = [];
    const eta = -Math.PI / 2 + (i / latSeg) * Math.PI; // -pi/2 .. pi/2
    const sinEta = Math.sin(eta);
    const cosEta = Math.cos(eta);
    const isSouth = i === 0;
    const isNorth = i === latSeg;

    for (let j = 0; j <= lonSeg; j += 1) {
      const omega = -Math.PI + (j / lonSeg) * 2 * Math.PI; // -pi .. pi
      const cosOmega = Math.cos(omega);
      const sinOmega = Math.sin(omega);

      const rHoriz = spow(cosEta, E1);
      let x = AX * rHoriz * spow(cosOmega, E2);
      let z = AZ * rHoriz * spow(sinOmega, E2);
      let y = AY * spow(sinEta, E1);

      const ny = sinEta; // -1 (bottom) .. 1 (top)

      // Subtle cervical waist on the lower half — a gentle narrowing, not a
      // sharp taper.
      if (ny < 0) {
        const t = THREE.MathUtils.smoothstep(-ny, 0, 1);
        const neck = THREE.MathUtils.lerp(1, 0.82, t);
        x *= neck;
        z *= neck;
      }

      // Occlusal sculpting, faded in toward the top cap only.
      const topF = THREE.MathUtils.smoothstep(ny, 0.02, 0.82);
      if (topF > 0) {
        const cx = 0.3;
        const cz = 0.29;
        const amp = 0.17;
        const sig = 0.05;

        // Four major cusps in two rows (buccal z>0, lingual z<0).
        let cusps =
          gauss2(x - cx, z - cz, sig) +
          gauss2(x + cx, z - cz, sig) +
          gauss2(x - cx, z + cz, sig) +
          gauss2(x + cx, z + cz, sig);
        cusps *= amp;

        // Smaller distal cusp (makes a 5-cusp read) on the mesiodistal end.
        const distal = gauss2(x - 0.36, z - 0.02, 0.045) * 0.08;

        // Cross-shaped central fissure: one groove along x=0, one along z=0.
        const fissure =
          0.13 * Math.exp(-(x * x) / 0.009) +
          0.13 * Math.exp(-(z * z) / 0.009);

        y += (cusps + distal - fissure * 0.5) * topF;
      }

      if (isSouth) {
        if (southIdx < 0) southIdx = push(x, y + CROWN_Y, z);
        row.push(southIdx);
      } else if (isNorth) {
        if (northIdx < 0) northIdx = push(x, y + CROWN_Y, z);
        row.push(northIdx);
      } else {
        row.push(push(x, y + CROWN_Y, z));
      }
    }
    grid.push(row);
  }

  const indices = [];
  for (let i = 0; i < latSeg; i += 1) {
    for (let j = 0; j < lonSeg; j += 1) {
      const a = grid[i][j];
      const b = grid[i][j + 1];
      const c = grid[i + 1][j];
      const d = grid[i + 1][j + 1];
      // Outward-facing winding.
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * One tapered root branch. Built along -Y (top at local origin), flattened
 * slightly, then splayed via rotation and moved to its attachment point under
 * the crown.
 */
function createRoot({ len, rTop, rTip, flatten, tiltX, tiltZ, at }) {
  const g = new THREE.CylinderGeometry(rTop, rTip, len, 16, 6, false);
  // Remove UVs so all parts share the same attribute set for merging.
  g.deleteAttribute("uv");
  g.translate(0, -len / 2, 0); // top ring at origin, body hangs down -Y
  g.scale(1, 1, flatten); // oval cross-section (buccolingually flatter)
  g.rotateZ(tiltZ); // splay in the mesiodistal (x) plane
  g.rotateX(tiltX); // splay in the buccolingual (z) plane
  g.translate(at[0], at[1], at[2]);
  g.computeVertexNormals();
  return g;
}

/** Concatenate several position+normal indexed geometries into one. */
function mergePositionNormal(geometries) {
  const pos = [];
  const nrm = [];
  const idx = [];
  let vBase = 0;

  for (const g of geometries) {
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const index = g.getIndex();

    for (let i = 0; i < p.count; i += 1) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    for (let i = 0; i < index.count; i += 1) {
      idx.push(index.getX(i) + vBase);
    }
    vBase += p.count;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return geo;
}

export function createMolarGeometry() {
  const crown = createCrown();

  // Upper-molar tripod: two buccal roots splaying left/right (visible in the
  // front view) plus one longer lingual root going down and back.
  const roots = [
    createRoot({
      len: 1.5,
      rTop: 0.27,
      rTip: 0.07,
      flatten: 0.74,
      tiltX: -0.15,
      tiltZ: 0.27,
      at: [0.16, 0.03, 0.13],
    }),
    createRoot({
      len: 1.5,
      rTop: 0.27,
      rTip: 0.07,
      flatten: 0.74,
      tiltX: -0.15,
      tiltZ: -0.27,
      at: [-0.16, 0.03, 0.13],
    }),
    createRoot({
      len: 1.6,
      rTop: 0.29,
      rTip: 0.08,
      flatten: 0.82,
      tiltX: 0.3,
      tiltZ: 0,
      at: [0, 0.05, -0.15],
    }),
  ];

  const geometry = mergePositionNormal([crown, ...roots]);

  // Keep overall proportions close to the previous model's framing.
  geometry.scale(1.08, 1.08, 1.08);
  geometry.computeVertexNormals();
  return geometry;
}
