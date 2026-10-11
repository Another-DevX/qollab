"use client";

import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const DEFAULT_DIR = new THREE.Vector3(0, 1, 0);
const tmpDir = new THREE.Vector3();

const direction = (v: [number, number, number], out: THREE.Vector3) => {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-9) return false;
  out.set(v[0] / len, v[1] / len, v[2] / len);
  return true;
};

const quatFor = (v: [number, number, number], out: THREE.Quaternion) => {
  if (!direction(v, tmpDir)) {
    out.identity();
    return;
  }
  out.setFromUnitVectors(DEFAULT_DIR, tmpDir);
};

export interface SceneArrowProps {
  vector: [number, number, number];
  color: string;
  from?: [number, number, number];
  opacity?: number;
}

/**
 * Flecha 3D animada. La transición entre direcciones se interpola con `slerp`
 * sobre la esfera, de modo que la punta recorre el arco geodésico correcto en
 * lugar de hundirse por el centro (importante en giros de π).
 *
 * El componente NO calcula física: sólo interpola hacia la dirección recibida.
 */
export function SceneArrow({ vector, color, from, opacity = 1 }: SceneArrowProps) {
  const group = useRef<THREE.Group>(null);
  const current = useRef(new THREE.Quaternion());
  const target = useRef(new THREE.Quaternion());
  const started = useRef(false);
  const reduce = useReducedMotion();

  const [vx, vy, vz] = vector;

  useEffect(() => {
    const node = group.current;
    const len = Math.hypot(vx, vy, vz);
    if (len < 1e-6) {
      node?.scale.setScalar(0);
      return;
    }
    node?.scale.setScalar(1);
    quatFor([vx, vy, vz], target.current);
    if (!started.current) {
      if (from) {
        quatFor(from, current.current);
      } else {
        current.current.copy(target.current);
      }
      started.current = true;
      node?.quaternion.copy(current.current);
    }
  }, [vx, vy, vz, from]);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    if (reduce) {
      node.quaternion.copy(target.current);
      return;
    }
    const t = 1 - Math.exp(-Math.min(delta, 0.05) * 7);
    current.current.slerp(target.current, t);
    node.quaternion.copy(current.current);
  });

  return (
    <group ref={group}>
      {/* Eje de la flecha */}
      <mesh position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.86, 14]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
      {/* Punta */}
      <mesh position={[0, 0.93, 0]}>
        <coneGeometry args={[0.05, 0.14, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
      {/* Origen */}
      <mesh>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
