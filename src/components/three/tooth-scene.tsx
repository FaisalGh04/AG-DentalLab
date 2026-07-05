"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { Tooth } from "./tooth";

type PointerState = { x: number; y: number };

/**
 * Studio scene for the hero tooth. Lighting is built entirely from in-scene
 * Lightformers (no external HDRI fetch — CSP/offline safe) which give the
 * clearcoat its soft, moving reflections.
 */
export function ToothScene({
  animate = true,
  onReady,
}: {
  animate?: boolean;
  onReady?: () => void;
}) {
  const pointer = React.useRef<PointerState>({ x: 0, y: 0 });
  const [width, setWidth] = React.useState(1280);
  const [finePointer, setFinePointer] = React.useState(true);

  React.useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const update = () => {
      setWidth(window.innerWidth);
      setFinePointer(media.matches);
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    media.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      media.removeEventListener("change", update);
    };
  }, []);

  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const canInteract = animate && finePointer && !isMobile;

  const camera = React.useMemo(
    () => ({
      position: isMobile
        ? ([0, 0.22, 6.8] as [number, number, number])
        : isTablet
          ? ([0, 0.22, 6.35] as [number, number, number])
          : ([0, 0.25, 6] as [number, number, number]),
      fov: isMobile ? 35 : 32,
    }),
    [isMobile, isTablet],
  );

  const modelScale = isMobile ? 1.12 : isTablet ? 1.03 : 0.96;

  React.useEffect(() => {
    if (!canInteract) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [canInteract]);

  return (
    <Canvas
      shadows
      dpr={isMobile ? [1, 1.4] : [1, 1.7]}
      frameloop={animate ? "always" : "demand"}
      gl={{
        antialias: !isMobile,
        alpha: true,
        powerPreference: "high-performance",
      }}
      camera={camera}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 4]} intensity={1.4} castShadow />
      <directionalLight position={[-5, 2, -3]} intensity={0.4} color="#A98643" />

      <React.Suspense fallback={null}>
        <Tooth
          pointer={pointer}
          animate={animate}
          scale={modelScale}
          onLoaded={onReady}
        />

        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.32}
          scale={9}
          blur={2.8}
          far={4.5}
          color="#17382F"
        />

        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            {/* Broad key softbox. */}
            <Lightformer
              form="rect"
              intensity={3}
              position={[0, 5, -2]}
              scale={[10, 6, 1]}
              color="#ffffff"
            />
            {/* Cool fill from the left. */}
            <Lightformer
              form="rect"
              intensity={1.2}
              position={[-5, 1, 1]}
              scale={[3, 6, 1]}
              color="#DCEAE1"
            />
            {/* Warm gold accent rim from the right — the luxury glint. */}
            <Lightformer
              form="rect"
              intensity={1.4}
              position={[5, 0, 1]}
              scale={[3, 6, 1]}
              color="#E7D2A6"
            />
            {/* Ring highlight for a rounded specular sweep. */}
            <Lightformer
              form="ring"
              intensity={1.6}
              position={[2, 3, 3]}
              scale={4}
              color="#ffffff"
            />
          </group>
        </Environment>
      </React.Suspense>
    </Canvas>
  );
}
