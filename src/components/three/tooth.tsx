"use client";

import * as React from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type PointerState = { x: number; y: number };
// Real anatomical molar scan (Sketchfab, CC-BY — see site footer), decimated to
// ~28k tris and Meshopt-compressed for the web. Baked upright + centred so the
// idle spin rotates it in place.
const TOOTH_MODEL_URL = "/models/molar_tooth.glb";

/**
 * Hero molar model with subtle camera-facing animation. Two nested groups keep
 * concerns clean:
 *  - outer group = cursor tilt (spring-lerped toward the pointer)
 *  - inner group = idle float + slow rotation
 */
export function Tooth({
  pointer,
  animate = true,
  scale = 1,
  onLoaded,
}: {
  pointer: React.MutableRefObject<PointerState>;
  animate?: boolean;
  scale?: number;
  onLoaded?: () => void;
}) {
  const tilt = React.useRef<THREE.Group>(null);
  const spin = React.useRef<THREE.Group>(null);
  // useDraco=false: the model is Meshopt-compressed (decoder bundled with drei),
  // so we avoid drei's default Draco decoder fetch from the gstatic CDN — keeping
  // the scene CSP/offline-safe like the rest of the hero.
  const { scene } = useGLTF(TOOTH_MODEL_URL, false);

  const material = React.useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#f8f6ef"),
      roughness: 0.26,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      reflectivity: 0.52,
      envMapIntensity: 1.1,
      sheen: 0.45,
      sheenRoughness: 0.62,
      sheenColor: new THREE.Color("#dceae1"),
      transmission: 0.04,
      thickness: 0.9,
      ior: 1.45,
    });
    return m;
  }, []);

  const molar = React.useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = material;
    });
    return clone;
  }, [material, scene]);

  React.useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  React.useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (spin.current) {
      if (animate) {
        spin.current.rotation.y += delta * 0.12;
        spin.current.position.y = Math.sin(t * 0.48) * 0.06;
      }
    }

    if (tilt.current) {
      const targetX = animate ? pointer.current.y * 0.26 : 0;
      const targetY = animate ? pointer.current.x * 0.34 : 0;
      const k = 1 - Math.pow(0.001, delta);
      tilt.current.rotation.x += (targetX - tilt.current.rotation.x) * k;
      tilt.current.rotation.y += (targetY - tilt.current.rotation.y) * k;
    }
  });

  return (
    <group ref={tilt} scale={scale}>
      <group ref={spin}>
        <primitive object={molar} position={[0, -0.08, 0]} />
      </group>
    </group>
  );
}

useGLTF.preload(TOOTH_MODEL_URL, false);
