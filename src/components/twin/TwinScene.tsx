"use client";

import { Suspense, useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Region, Severity } from "@/lib/health/types";
import { REGIONS, REGION_LABEL } from "@/lib/health/types";
import { CrewModel, HOTSPOT } from "./CrewModel";

export interface TwinSceneProps {
  severity: Record<Region, Severity>;
  labels: Partial<Record<Region, string>>;
  selected: Region | null;
  hovered: Region | null;
  onSelect: (r: Region | null) => void;
  onHover: (r: Region | null) => void;
  respiration: number;
  femininity: number;
}

const BODY_OFFSET = new THREE.Vector3(0, -0.85, 0);

/**
 * Projects each region's anchor to screen space every frame and moves the
 * matching DOM hotspot. Plain DOM keeps the buttons accessible and avoids a
 * React root per marker.
 */
function HotspotProjector({ onProject }: { onProject: (r: Region, x: number, y: number, visible: boolean) => void }) {
  const v = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    const facing = camera.position.z > -0.2;
    for (const r of REGIONS) {
      v.current.set(...HOTSPOT[r]).add(BODY_OFFSET).project(camera);
      onProject(r, (v.current.x * 0.5 + 0.5) * size.width, (-v.current.y * 0.5 + 0.5) * size.height, facing);
    }
  });
  return null;
}

/** No remote HDRIs or fonts: the scene must render with zero network access. */
export default function TwinScene(props: TwinSceneProps) {
  const refs = useRef<Partial<Record<Region, HTMLButtonElement | null>>>({});
  const { severity, labels, selected, hovered, onSelect, onHover } = props;

  const project = useCallback((r: Region, x: number, y: number, visible: boolean) => {
    const el = refs.current[r];
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    el.style.opacity = visible ? "1" : "0";
    el.style.pointerEvents = visible ? "auto" : "none";
  }, []);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.9, 3.6], fov: 32 }}
        onPointerMissed={() => onSelect(null)}
        gl={{ antialias: true }}
      >
        <hemisphereLight args={["#ffffff", "#cfd6e2", 1]} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#dbe6ff" />
        <group position={BODY_OFFSET.toArray()}>
          <Suspense fallback={null}>
            <CrewModel
              severity={props.severity}
              selected={selected}
              hovered={hovered}
              onSelect={onSelect}
              onHover={onHover}
              respiration={props.respiration}
              femininity={props.femininity}
            />
          </Suspense>
          <ContactShadows position={[0, -0.02, 0]} opacity={0.28} scale={4} blur={2.6} far={2} />
        </group>
        <OrbitControls
          target={[0, 0.05, 0]}
          enablePan={false}
          minDistance={1.8}
          maxDistance={5}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.62}
        />
        <HotspotProjector onProject={project} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {REGIONS.map((r) => {
          const sev = severity[r];
          const label = sev > 0 ? labels[r] : undefined;
          const showLabel = Boolean(label) || selected === r || hovered === r;
          return (
            <button
              key={r}
              ref={(el) => {
                refs.current[r] = el;
              }}
              type="button"
              className={`hotspot absolute top-0 left-0 transition-opacity duration-200 ${sev ? `hotspot--s${sev}` : ""}`}
              style={{ opacity: 0 }}
              aria-pressed={selected === r}
              aria-label={`${REGION_LABEL[r]}${label ? `: ${label}` : ""}`}
              onClick={() => onSelect(selected === r ? null : r)}
              onPointerEnter={() => onHover(r)}
              onPointerLeave={() => onHover(null)}
            >
              {showLabel && <span className="hotspot-label">{label ?? REGION_LABEL[r]}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
