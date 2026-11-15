"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { ExerciseId } from "@/lib/exercise/exercises";
import { HEAT_COLORS } from "@/components/twin/heat";

/**
 * The crew twin showing how an exercise is done. The clips are keyframes only
 * (scripts/exercise-clips.py, built in Blender on the twin's own rig) and play on a
 * copy of the body the app already ships, so the tutorial needs no network.
 */
const MODEL_URL = "/twin/crew-body.glb";
const CLIPS_URL = "/twin/crew-exercises.glb";

/** Where the camera stands, in degrees around the twin (0 = straight in front). */
const VIEW: Record<ExerciseId, number> = { squat: 42, deadlift: 72, lunge: 74, press: 14, curl: 40, highKnees: 50 };
const DISTANCE = 4;

function Body({ id, femininity }: { id: ExerciseId; femininity: number }) {
  // `false`: the files aren't Draco-compressed, so no decoder is fetched from a CDN.
  const { scene } = useGLTF(MODEL_URL, false);
  const { animations } = useGLTF(CLIPS_URL, false);
  // A copy with its own skeleton: the twin on the other screens keeps its pose and material.
  const body = useMemo(() => clone(scene), [scene]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: HEAT_COLORS[0], roughness: 0.42, metalness: 0.02 }), []);
  const mixer = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    body.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.material = material;
      if (mesh.morphTargetInfluences?.length) mesh.morphTargetInfluences[0] = femininity;
      mesh.frustumCulled = false;
    });
  }, [body, material, femininity]);

  useEffect(() => {
    const m = new THREE.AnimationMixer(body);
    const clip = THREE.AnimationClip.findByName(animations, id);
    if (clip) m.clipAction(clip).play();
    mixer.current = m;
    return () => {
      m.stopAllAction();
      m.uncacheRoot(body);
      mixer.current = null;
    };
  }, [body, animations, id]);

  useFrame((_, delta) => mixer.current?.update(delta));

  return <primitive object={body} />;
}

/** WebGL can be unavailable or lose its context: the tutorial text still stands on its own. */
class DemoBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function ExerciseDemo({ id, femininity, label }: { id: ExerciseId; femininity: number; label: string }) {
  const yaw = (VIEW[id] * Math.PI) / 180;
  return (
    <div role="img" aria-label={label} className="h-full w-full">
      <DemoBoundary>
        <Canvas dpr={[1, 2]} camera={{ position: [Math.sin(yaw) * DISTANCE, 0.5, Math.cos(yaw) * DISTANCE], fov: 32 }} gl={{ antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 0.2, 0)}>
          <hemisphereLight args={["#ffffff", "#8fa0bd", 1.1]} />
          <directionalLight position={[2.5, 4, 3]} intensity={1.8} />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#dbe6ff" />
          <group position={[0, -0.85, 0]}>
            <Suspense fallback={null}>
              <Body id={id} femininity={femininity} />
            </Suspense>
            <ContactShadows position={[0, -0.02, 0]} opacity={0.45} scale={5} blur={2.4} far={2} />
          </group>
        </Canvas>
      </DemoBoundary>
    </div>
  );
}
