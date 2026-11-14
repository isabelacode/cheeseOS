"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Region, Severity } from "@/lib/health/types";
import { REGIONS } from "@/lib/health/types";

/** Authored in Blender (assets/crew-body.blend): skinned body with an "Idle" breathing loop. */
const MODEL_URL = "/twin/crew-body.glb";
/** The Idle clip is one breath cycle of 4 s, i.e. 15 breaths per minute. */
const CLIP_RPM = 15;

type V3 = [number, number, number];

/** Hotspots on the front surface of each region (model space, y-up, +z is the front). */
export const HOTSPOT: Record<Region, V3> = {
  head: [0, 1.68, 0.115],
  torso: [0.05, 1.32, 0.15],
  abdomen: [0, 1.02, 0.13],
  leftArm: [0.25, 1.1, 0.05],
  rightArm: [-0.25, 1.1, 0.05],
  leftLeg: [0.1, 0.72, 0.09],
  rightLeg: [-0.1, 0.72, 0.09],
};

/** Region of a vertex from its bind-pose position. +x is the person's left. */
function regionOf(x: number, y: number): number {
  if (y > 1.5) return REGIONS.indexOf("head");
  if (Math.abs(x) > 0.165 && y > 0.72) return REGIONS.indexOf(x > 0 ? "leftArm" : "rightArm");
  if (y > 1.13) return REGIONS.indexOf("torso");
  if (y > 0.88) return REGIONS.indexOf("abdomen");
  return REGIONS.indexOf(x > 0 ? "leftLeg" : "rightLeg");
}

const SEVERITY_RGB: Record<Severity, THREE.Color> = {
  0: new THREE.Color("#e3e6eb"),
  1: new THREE.Color("#e8b54a"),
  2: new THREE.Color("#e07b2e"),
  3: new THREE.Color("#d63b3b"),
};

/** One body on screen at a time, so the shader state lives at module scope. */
const uniforms = {
  uSeverity: { value: new Float32Array(REGIONS.length) },
  uFocus: { value: -1 },
  uTime: { value: 0 },
  uTint: { value: [SEVERITY_RGB[0], SEVERITY_RGB[1], SEVERITY_RGB[2], SEVERITY_RGB[3]] },
};

interface Props {
  severity: Record<Region, Severity>;
  selected: Region | null;
  hovered: Region | null;
  onSelect: (r: Region | null) => void;
  onHover: (r: Region | null) => void;
  respiration: number;
}

export function CrewModel({ severity, selected, hovered, onSelect, onHover, respiration }: Props) {
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
        .replace("#include <common>", "#include <common>\nattribute float region;\nflat varying int vRegion;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRegion = int(region + 0.5);");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
flat varying int vRegion;
uniform float uSeverity[${REGIONS.length}];
uniform int uFocus;
uniform float uTime;
uniform vec3 uTint[4];`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float sev = uSeverity[vRegion];
int level = int(sev + 0.5);
vec3 tint = uTint[level];
float pulse = level > 0 ? 0.5 + 0.5 * sin(uTime * (1.5 + sev)) : 0.0;
diffuseColor.rgb = mix(diffuseColor.rgb, tint, level > 0 ? 0.7 : 0.0);
vec3 extraGlow = tint * pulse * 0.12 * sev;
if (vRegion == uFocus) extraGlow += vec3(0.08, 0.38, 1.0) * 0.12;`,
        )
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += extraGlow;");
    };
    return m;
  }, []);

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
      mesh.material = material;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
    });
  }, [scene, material]);

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
        const r = regionAt(e);
        onSelect(r && r !== selected ? r : null);
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL, false);
