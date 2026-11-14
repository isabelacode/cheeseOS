"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Region, Severity } from "@/lib/health/types";

/**
 * A neutral, clinical body figure (no suit): the crew member as they are
 * inside the station. Built from primitives so each region can be tinted.
 */

const SKIN = new THREE.Color("#e3e6eb");
const HOVER_GLOW = new THREE.Color("#1462ff");
const SEVERITY_COLOR: Record<Severity, THREE.Color> = {
  0: SKIN,
  1: new THREE.Color("#e8b54a"),
  2: new THREE.Color("#e07b2e"),
  3: new THREE.Color("#d63b3b"),
};

type V3 = [number, number, number];

interface Props {
  severity: Record<Region, Severity>;
  selected: Region | null;
  hovered: Region | null;
  onSelect: (r: Region | null) => void;
  onHover: (r: Region | null) => void;
  respiration: number;
}

function Part({
  region,
  severity,
  selected,
  hovered,
  onSelect,
  onHover,
  children,
}: {
  region: Region;
  severity: Severity;
  selected: boolean;
  hovered: boolean;
  onSelect: (r: Region | null) => void;
  onHover: (r: Region | null) => void;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const color = useRef(SKIN.clone());
  const emissive = useRef(new THREE.Color());
  const tint = useRef(new THREE.Color());

  useFrame(({ clock }) => {
    const target = SEVERITY_COLOR[severity];
    tint.current.copy(SKIN).lerp(target, severity ? 0.7 : 0);
    color.current.lerp(tint.current, 0.08);
    const pulse = severity ? (Math.sin(clock.elapsedTime * (1.5 + severity)) + 1) / 2 : 0;
    const glow = severity ? 0.1 + pulse * 0.25 * severity : selected || hovered ? 0.12 : 0;
    emissive.current.copy(severity ? target : HOVER_GLOW).multiplyScalar(glow);
    group.current?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial;
      m.color.copy(color.current);
      m.emissive.copy(emissive.current);
    });
  });

  return (
    <group
      ref={group}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(region);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(selected ? null : region);
      }}
    >
      {children}
    </group>
  );
}

function Skin() {
  return <meshStandardMaterial color={SKIN} roughness={0.42} metalness={0.02} />;
}

function Capsule({ position, rotation, radius, length }: { position: V3; rotation?: V3; radius: number; length: number }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <capsuleGeometry args={[radius, length, 10, 24]} />
      <Skin />
    </mesh>
  );
}

/** Smooth body segment from a (radius, height) silhouette, flattened front-to-back. */
function Lathe({ profile, depth }: { profile: [number, number][]; depth: number }) {
  const geometry = useMemo(
    () => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 48),
    [profile],
  );
  return (
    <mesh geometry={geometry} scale={[1, 1, depth]} castShadow>
      <Skin />
    </mesh>
  );
}

const CHEST_PROFILE: [number, number][] = [
  [0, 1.08],
  [0.142, 1.08],
  [0.15, 1.16],
  [0.168, 1.26],
  [0.182, 1.35],
  [0.188, 1.42],
  [0.17, 1.468],
  [0.11, 1.495],
  [0.05, 1.505],
  [0, 1.505],
];

const ABDOMEN_PROFILE: [number, number][] = [
  [0, 0.84],
  [0.12, 0.84],
  [0.158, 0.88],
  [0.162, 0.94],
  [0.146, 1.01],
  [0.143, 1.08],
  [0.138, 1.13],
  [0, 1.13],
];

function Arm({ side }: { side: 1 | -1 }) {
  // side 1 = the person's left (viewer's right, +x), facing the camera.
  return (
    <group position={[0.2 * side, 1.43, 0]} rotation={[0, 0, 0.13 * side]}>
      <mesh castShadow>
        <sphereGeometry args={[0.058, 24, 16]} />
        <Skin />
      </mesh>
      <Capsule position={[0, -0.16, 0]} radius={0.043} length={0.22} />
      <Capsule position={[0, -0.43, 0.012]} rotation={[0.08, 0, 0]} radius={0.036} length={0.22} />
      {/* Hand */}
      <mesh position={[0, -0.63, 0.02]} scale={[0.75, 1.3, 0.38]} castShadow>
        <sphereGeometry args={[0.05, 20, 16]} />
        <Skin />
      </mesh>
    </group>
  );
}

function Leg({ side }: { side: 1 | -1 }) {
  return (
    <group position={[0.088 * side, 0.86, 0]}>
      <Capsule position={[0, -0.2, 0]} rotation={[0, 0, -0.02 * side]} radius={0.068} length={0.3} />
      <Capsule position={[0.004 * side, -0.6, -0.005]} radius={0.048} length={0.34} />
      {/* Foot */}
      <mesh position={[0.006 * side, -0.835, 0.045]} scale={[0.8, 0.45, 1.9]} castShadow>
        <sphereGeometry args={[0.05, 20, 16]} />
        <Skin />
      </mesh>
    </group>
  );
}

/** Hotspots sit on the front surface of each region (body-local coordinates). */
export const HOTSPOT: Record<Region, V3> = {
  head: [0, 1.68, 0.11],
  torso: [0.06, 1.32, 0.12],
  abdomen: [0, 0.97, 0.11],
  leftArm: [0.27, 1.08, 0.05],
  rightArm: [-0.27, 1.08, 0.05],
  leftLeg: [0.1, 0.6, 0.07],
  rightLeg: [-0.1, 0.6, 0.07],
};

export function HumanBody({ severity, selected, hovered, onSelect, onHover, respiration }: Props) {
  const body = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Barely-there postural sway, so the figure reads as alive.
    if (body.current) body.current.rotation.z = Math.sin(t * 0.4) * 0.006;
    if (chest.current) {
      const breath = Math.sin(t * Math.PI * 2 * (respiration / 60));
      chest.current.scale.set(1 + breath * 0.012, 1 + breath * 0.004, 1 + breath * 0.035);
    }
  });

  const part = (region: Region, children: ReactNode) => (
    <Part
      key={region}
      region={region}
      severity={severity[region]}
      selected={selected === region}
      hovered={hovered === region}
      onSelect={onSelect}
      onHover={onHover}
    >
      {children}
    </Part>
  );

  return (
    <group ref={body}>
      {part(
        "head",
        <group>
          <mesh position={[0, 1.665, 0.005]} scale={[0.86, 1.08, 0.98]} castShadow>
            <sphereGeometry args={[0.11, 48, 32]} />
            <Skin />
          </mesh>
          <mesh position={[0, 1.535, -0.005]} castShadow>
            <cylinderGeometry args={[0.042, 0.05, 0.1, 24]} />
            <Skin />
          </mesh>
        </group>,
      )}

      {part(
        "torso",
        // Breathing scales around the bottom of the ribcage.
        <group ref={chest} position={[0, 1.08, 0]}>
          <group position={[0, -1.08, 0]}>
            <Lathe profile={CHEST_PROFILE} depth={0.6} />
          </group>
        </group>,
      )}

      {part("abdomen", <Lathe profile={ABDOMEN_PROFILE} depth={0.68} />)}

      {part("leftArm", <Arm side={1} />)}
      {part("rightArm", <Arm side={-1} />)}
      {part("leftLeg", <Leg side={1} />)}
      {part("rightLeg", <Leg side={-1} />)}

    </group>
  );
}
