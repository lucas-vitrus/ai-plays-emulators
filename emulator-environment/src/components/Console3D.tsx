// frontend/src/components/Console3D.tsx
// This file defines a React component for a 3D scene featuring a Nintendo 64 model
// and an interactive HTML console window, built with React Three Fiber and Drei.

import React, { Suspense, useRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
} from "@react-three/drei";
// Assuming a useApp hook for theme, if not available, Tailwind dark variants will be used.
// import { useApp } from '@/hooks/useApp'; // Example, adjust path as needed

const N64_MODEL_URL =
  "https://rpuqlzpbhnfjvmauvgiz.supabase.co/storage/v1/object/public/roms//nintendo_64.glb";


interface Nintendo64ModelProps {
  position?: [number, number, number];
  children?: React.ReactNode; // Allow children to be passed
}

const Nintendo64Model = React.forwardRef<THREE.Group, Nintendo64ModelProps>(
  (props, forwardedRef) => {
    const group = useRef<THREE.Group>(null!);
    const { scene } = useGLTF(N64_MODEL_URL);

    useImperativeHandle(forwardedRef, () => group.current);

    // Floating animation
    useFrame((state) => {
      const t = state.clock.getElapsedTime();
      if (group.current) {
        const baseY =
          props.position && props.position[1] !== undefined
            ? props.position[1]
            : 0;
        const hoverOffsetY = Math.sin(t) / 5;

        group.current.rotation.y = THREE.MathUtils.lerp(
          group.current.rotation.y,
          Math.sin(t / 2) / 4,
          0.01
        );
        group.current.position.y = THREE.MathUtils.lerp(
          group.current.position.y,
          baseY + hoverOffsetY,
          0.01
        );
      }
    });

    return (
      // Use the internal group ref for the component's operations.
      // The forwardedRef (if provided) will point to this group's instance.
      // props spread will pass down position, etc.
      <group ref={group} {...props} dispose={null} scale={5}>
        {props.children} {/* Render children first as per user's diff */}
        <primitive object={scene} scale={1} />
      </group>
    );
  }
);
Nintendo64Model.displayName = "Nintendo64Model";

useGLTF.preload(N64_MODEL_URL);

const Console3D: React.FC = () => {
  const n64ModelRef = useRef<THREE.Group>(null!);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 10, 5], fov: 40, near: 0.1, far: 1000 }}
      className="absolute bottom-0 w-full h-full" // Example background
    >
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[5, 10, 7.5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer
            intensity={4}
            rotation-x={Math.PI / 2}
            position={[0, 5, -9]}
            scale={[10, 10, 1]}
          />
          <Lightformer
            intensity={2}
            rotation-y={Math.PI / 2}
            position={[-5, 1, -1]}
            scale={[10, 2, 1]}
          />
          <Lightformer
            intensity={2}
            rotation-y={Math.PI / 2}
            position={[-5, -1, -1]}
            scale={[10, 2, 1]}
          />
          <Lightformer
            intensity={2}
            rotation-y={-Math.PI / 2}
            position={[10, 1, 0]}
            scale={[20, 2, 1]}
          />
          <Lightformer
            type="ring"
            intensity={2}
            rotation-y={Math.PI / 2}
            position={[-0.1, -1, -5]}
            scale={10}
          />
        </group>
      </Environment>

      <Suspense fallback={null}>
        {/* HtmlConsoleWindow is now a child of Nintendo64Model */}
        <Nintendo64Model
          ref={n64ModelRef}
          position={[0, 0, 0]}
        ></Nintendo64Model>

        {/* <HtmlConsoleWindow
          position={[0, 2, -12]} // Using user's latest position
          rotation={[0, 0, 0]} // Slightly tilted back
          // Pass the ref to the N64 model group for explicit occlusion
          // Ensure the ref object itself is passed in the array.
          occluders={n64ModelRef.current ? [n64ModelRef] : undefined}
        /> */}

        <ContactShadows
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -1.45, 0]} // Adjusted slightly due to potential model scale/position changes
          opacity={0.75}
          width={10}
          height={10}
          blur={2}
          far={2} // was 2, example mac uses 4.5
        />
      </Suspense>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        minDistance={2} // was 2
        maxDistance={20} // was 20
        minPolarAngle={Math.PI / 4} // was Math.PI / 4
        maxPolarAngle={Math.PI * (3 / 4)} // was Math.PI * (3 / 4)
      />
    </Canvas>
  );
};

export default Console3D;
