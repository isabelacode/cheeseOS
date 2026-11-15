"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Region, Severity } from "@/lib/health/types";
import { REGIONS } from "@/lib/health/types";
import { HEAT_COLORS } from "./heat";

/**
 * Rigged in Blender (assets/crew-body.blend) from Blender Studio's CC0 "Human Base
 * Meshes". One skinned body with a "Female" morph target and an "Idle" breathing loop.
 */
const MODEL_URL = "/twin/crew-body.glb";
/** The Idle clip is one breath cycle of 4 s, i.e. 15 breaths per minute. */
const CLIP_RPM = 15;

type V3 = [number, number, number];

/** Hotspots on the front surface of each region (model space, y-up, +z is the front). */
export const HOTSPOT: Record<Region, V3> = {
  head: [0, 1.6, 0.1],
  torso: [0.07, 1.3, 0.12],
  abdomen: [0, 1.02, 0.12],
  leftArm: [0.3, 1.08, 0.03],
  rightArm: [-0.3, 1.08, 0.03],
  leftLeg: [0.1, 0.7, 0.08],
  rightLeg: [-0.1, 0.7, 0.08],
};

/** Heat zone per region: ellipsoid centre and radii, model space. */
const HEAT_ZONE: Record<Region, [V3, V3]> = {
  head: [[0, 1.585, 0.0], [0.13, 0.15, 0.14]],
  torso: [[0, 1.3, 0.02], [0.21, 0.17, 0.17]],
  abdomen: [[0, 1.02, 0.02], [0.19, 0.13, 0.16]],
  leftArm: [[0.29, 1.08, -0.01], [0.13, 0.32, 0.11]],
  rightArm: [[-0.29, 1.08, -0.01], [0.13, 0.32, 0.11]],
  leftLeg: [[0.1, 0.55, 0.01], [0.12, 0.42, 0.12]],
  rightLeg: [[-0.1, 0.55, 0.01], [0.12, 0.42, 0.12]],
};

/** Region of a vertex from its bind-pose position. +x is the person's left. */
function regionOf(x: number, y: number): number {
  if (y > 1.46) return REGIONS.indexOf("head");
  if (Math.abs(x) > 0.185 && y > 0.7) return REGIONS.indexOf(x > 0 ? "leftArm" : "rightArm");
  if (y > 1.13) return REGIONS.indexOf("torso");
  if (y > 0.9) return REGIONS.indexOf("abdomen");
  return REGIONS.indexOf(x > 0 ? "leftLeg" : "rightLeg");
}

const SEVERITY_RGB: Record<Severity, THREE.Color> = {
  0: new THREE.Color(HEAT_COLORS[0]),
  1: new THREE.Color(HEAT_COLORS[1]),
  2: new THREE.Color(HEAT_COLORS[2]),
  3: new THREE.Color(HEAT_COLORS[3]),
};

/** One body on screen at a time, so the shader state lives at module scope. */
const uniforms = {
  uSeverity: { value: new Float32Array(REGIONS.length) },
  uFocus: { value: -1 },
  uTime: { value: 0 },
  uTint: { value: [SEVERITY_RGB[0], SEVERITY_RGB[1], SEVERITY_RGB[2], SEVERITY_RGB[3]] },
  uCenter: { value: REGIONS.map((r) => new THREE.Vector3(...HEAT_ZONE[r][0])) },
  uRadius: { value: REGIONS.map((r) => new THREE.Vector3(...HEAT_ZONE[r][1])) },
};

interface Props {
  severity: Record<Region, Severity>;
  selected: Region | null;
  hovered: Region | null;
  onSelect: (r: Region | null) => void;
  onHover: (r: Region | null) => void;
  respiration: number;
  /** 0 = male base, 1 = female morph, in between for a neutral figure. */
  femininity: number;
}

export function CrewModel({ severity, selected, hovered, onSelect, onHover, respiration, femininity }: Props) {
  const group = useRef<THREE.Group>(null);
  // `false`: the file isn't Draco-compressed, so no decoder is fetched from a CDN.
  const { scene, animations } = useGLTF(MODEL_URL, false);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const idle = useRef<THREE.AnimationAction | null>(null);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: SEVERITY_RGB[0], roughness: 0.42, metalness: 0.02 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBind;")
        // Bind-pose position: the heat zones stay glued to the body while it animates.
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBind = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vBind;
uniform float uSeverity[${REGIONS.length}];
uniform vec3 uCenter[${REGIONS.length}];
uniform vec3 uRadius[${REGIONS.length}];
uniform int uFocus;
uniform float uTime;
uniform vec3 uTint[4];`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
// Soft ellipsoidal heat zones instead of hard per-vertex region borders.
vec3 heatColor = vec3(0.0);
float heat = 0.0;
float focusGlow = 0.0;
for (int i = 0; i < ${REGIONS.length}; i++) {
  float d = length((vBind - uCenter[i]) / uRadius[i]);
  float w = 1.0 - smoothstep(0.5, 1.2, d);
  float sev = uSeverity[i];
  if (sev > 0.01) {
    float lv = clamp(sev, 1.0, 3.0);
    vec3 tint = lv < 2.0 ? mix(uTint[1], uTint[2], lv - 1.0) : mix(uTint[2], uTint[3], lv - 2.0);
    float pulse = 0.85 + 0.15 * sin(uTime * (1.5 + sev));
    float a = w * clamp(0.55 + 0.2 * (sev - 1.0), 0.0, 1.0) * min(sev, 1.0) * pulse;
    if (a > heat) { heat = a; heatColor = tint; }
  }
  if (i == uFocus) focusGlow = max(focusGlow, w);
}
diffuseColor.rgb = mix(diffuseColor.rgb, heatColor, min(1.0, heat * 1.1));
vec3 extraGlow = heatColor * heat * 0.22 + vec3(0.08, 0.38, 1.0) * focusGlow * 0.35;`,
        )
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += extraGlow;");
    };
    return m;
  }, []);

  // Free the GPU program when the twin unmounts (route change); also reset a hover cursor left behind.
  useEffect(
    () => () => {
      material.dispose();
      document.body.style.cursor = "";
    },
    [material],
  );

  // Tag each vertex with its body region and swap in the region-aware material.
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.getAttribute("position");
      if (!mesh.geometry.getAttribute("region")) {
        const region = new Float32Array(pos.count);
        for (let i = 0; i < pos.count; i++) region[i] = regionOf(pos.getX(i), pos.getY(i));
        mesh.geometry.setAttribute("region", new THREE.BufferAttribute(region, 1));
      }
      const prev = mesh.material;
      if (prev !== material) (Array.isArray(prev) ? prev : [prev]).forEach((m) => m.dispose());
      mesh.material = material;
      if (mesh.morphTargetInfluences?.length) mesh.morphTargetInfluences[0] = femininity;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
    });
  }, [scene, material, femininity]);

  useEffect(() => {
    const m = new THREE.AnimationMixer(scene);
    const clip = THREE.AnimationClip.findByName(animations, "Idle") ?? animations[0];
    const action = clip ? m.clipAction(clip) : null;
    action?.play();
    mixer.current = m;
    idle.current = action;
    return () => {
      m.stopAllAction();
      m.uncacheRoot(scene);
      mixer.current = null;
      idle.current = null;
    };
  }, [scene, animations]);

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
    REGIONS.forEach((r, i) => {
      const cur = uniforms.uSeverity.value[i];
      uniforms.uSeverity.value[i] = cur + (severity[r] - cur) * Math.min(1, delta * 6);
    });
    const focus = selected ?? hovered;
    uniforms.uFocus.value = focus ? REGIONS.indexOf(focus) : -1;
    if (idle.current) idle.current.timeScale = Math.max(0.4, Math.min(2.6, respiration / CLIP_RPM));
    mixer.current?.update(delta);
  });

  const regionAt = (e: ThreeEvent<PointerEvent | MouseEvent>): Region | null => {
    const mesh = e.object as THREE.Mesh;
    const attr = mesh.geometry?.getAttribute("region");
    if (!attr || !e.face) return null;
    return REGIONS[Math.round(attr.getX(e.face.a))] ?? null;
  };

  return (
    <group
      ref={group}
      onPointerMove={(e) => {
        e.stopPropagation();
        const r = regionAt(e);
        if (r !== hovered) onHover(r);
        document.body.style.cursor = r ? "pointer" : "";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        // An orbit drag that ends over the body is not a click on a region.
        if (e.delta > 2) return;
        const r = regionAt(e);
        onSelect(r && r !== selected ? r : null);
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL, false);
