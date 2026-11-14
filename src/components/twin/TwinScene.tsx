"use client";

import { Suspense, useCallback, useRef, type ComponentRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Region, Severity } from "@/lib/health/types";
import { REGIONS } from "@/lib/health/types";
import { RotateCcw } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n";
import { bodyMessages } from "@/lib/i18n/pages/body";
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
const LIMBS = new Set<Region>(["leftArm", "rightArm", "leftLeg", "rightLeg"]);

/**
 * Projects each region's anchor to screen space every frame and moves the
 * matching DOM hotspot. Plain DOM keeps the buttons accessible and avoids a
 * React root per marker.
 */
function HotspotProjector({ onProject }: { onProject: (r: Region, x: number, y: number, visible: boolean, centerX: number) => void }) {
  const v = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    const facing = camera.position.z > -0.2;
    // Screen x of the body midline: limb labels open away from it so they never cover the other side.
    v.current.set(0, HOTSPOT.abdomen[1], 0).add(BODY_OFFSET).project(camera);
    const centerX = (v.current.x * 0.5 + 0.5) * size.width;
    for (const r of REGIONS) {
      v.current.set(...HOTSPOT[r]).add(BODY_OFFSET).project(camera);
      onProject(r, (v.current.x * 0.5 + 0.5) * size.width, (-v.current.y * 0.5 + 0.5) * size.height, facing, centerX);
    }
  });
  return null;
}

/** No remote HDRIs or fonts: the scene must render with zero network access. */
export default function TwinScene(props: TwinSceneProps) {
  const refs = useRef<Partial<Record<Region, HTMLButtonElement | null>>>({});
  const { severity, labels, selected, hovered, onSelect, onHover } = props;
  const t = useT();
  const b = bodyMessages[useLocale()];
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  const project = useCallback((r: Region, x: number, y: number, visible: boolean, centerX: number) => {
    const el = refs.current[r];
    if (!el) return;
    const side = LIMBS.has(r) && x < centerX ? "left" : "right";
    if (el.dataset.side !== side) el.dataset.side = side;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    el.style.opacity = visible ? "1" : "0";
    el.style.pointerEvents = visible ? "auto" : "none";
    el.tabIndex = visible ? 0 : -1;
  }, []);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="percentage"
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
          ref={controls}
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
              aria-label={`${t.regions[r]}${label ? `: ${label}` : ""}`}
              onClick={() => onSelect(selected === r ? null : r)}
              onPointerEnter={() => onHover(r)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(r)}
              onBlur={() => onHover(null)}
            >
              {showLabel && <span className="hotspot-label">{label ?? t.regions[r]}</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => controls.current?.reset()}
        className="absolute top-4 right-4 flex min-h-11 items-center gap-1.5 rounded-full bg-surface/90 px-3.5 text-xs font-semibold text-ink-2 shadow-card backdrop-blur-sm transition-colors hover:bg-surface hover:text-ink"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        {b.recenter}
      </button>
    </div>
  );
}
