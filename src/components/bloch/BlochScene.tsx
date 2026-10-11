"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import type { Palette } from "@/lib/theme";
import { SceneArrow } from "./SceneArrow";
import type { BlochArrow } from "./types";

const AXIS_DIRS: Array<{ key: "x" | "y" | "z"; dir: [number, number, number]; label: string }> = [
  { key: "x", dir: [1, 0, 0], label: "X" },
  { key: "y", dir: [0, 1, 0], label: "Y" },
  { key: "z", dir: [0, 0, 1], label: "Z" },
];

const AXIS_LENGTH = 1.32;
const LABEL_AT = 1.46;

/** Textura de etiqueta generada en canvas (sin dependencias de red). */
const makeLabelTexture = (text: string, color: string): THREE.CanvasTexture => {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = color;
    ctx.font = "bold 88px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, size / 2, size / 2 + 6);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

function AxisLabel({
  position,
  text,
  color,
}: {
  position: [number, number, number];
  text: string;
  color: string;
}) {
  const texture = useMemo(() => makeLabelTexture(text, color), [text, color]);
  return (
    <sprite position={position} scale={0.24}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

const circlePoints = (
  plane: "xy" | "xz" | "yz",
  radius = 1,
  segments = 96,
): [number, number, number][] => {
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a) * radius;
    const s = Math.sin(a) * radius;
    if (plane === "xy") points.push([c, s, 0]);
    else if (plane === "xz") points.push([c, 0, s]);
    else points.push([0, c, s]);
  }
  return points;
};

function Graticule({ palette }: { palette: Palette }) {
  const equator = useMemo(() => circlePoints("xy"), []);
  const meridianXZ = useMemo(() => circlePoints("xz"), []);
  const meridianYZ = useMemo(() => circlePoints("yz"), []);
  return (
    <>
      <Line points={equator} color={palette.equator} lineWidth={1.1} transparent opacity={0.55} />
      <Line points={meridianXZ} color={palette.grid} lineWidth={0.8} transparent opacity={0.28} />
      <Line points={meridianYZ} color={palette.grid} lineWidth={0.8} transparent opacity={0.28} />
    </>
  );
}

interface SceneProps {
  arrows: BlochArrow[];
  showLabels: boolean;
  autoRotate: boolean;
  palette: Palette;
}

function Scene({ arrows, showLabels, autoRotate, palette }: SceneProps) {
  const axisColor = (key: "x" | "y" | "z") =>
    key === "x" ? palette.axisX : key === "y" ? palette.axisY : palette.axisZ;

  return (
    <>
      {/* Cáscara translúcida */}
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={palette.shell} transparent opacity={0.05} depthWrite={false} />
      </mesh>
      {/* Retícula de la esfera */}
      <mesh>
        <sphereGeometry args={[1, 28, 18]} />
        <meshBasicMaterial color={palette.wire} wireframe transparent opacity={0.16} depthWrite={false} />
      </mesh>

      <Graticule palette={palette} />

      {/* Ejes coordenados */}
      {AXIS_DIRS.map((axis) => (
        <Line
          key={axis.key}
          points={[
            [-axis.dir[0] * AXIS_LENGTH, -axis.dir[1] * AXIS_LENGTH, -axis.dir[2] * AXIS_LENGTH],
            [axis.dir[0] * AXIS_LENGTH, axis.dir[1] * AXIS_LENGTH, axis.dir[2] * AXIS_LENGTH],
          ]}
          color={axisColor(axis.key)}
          lineWidth={1.3}
          transparent
          opacity={0.7}
        />
      ))}

      {showLabels &&
        AXIS_DIRS.map((axis) => (
          <AxisLabel
            key={`label-${axis.key}`}
            position={[axis.dir[0] * LABEL_AT, axis.dir[1] * LABEL_AT, axis.dir[2] * LABEL_AT]}
            text={axis.label}
            color={axisColor(axis.key)}
          />
        ))}

      {/* Vectores de estado (independientes de la cámara) */}
      {arrows.map((arrow) => (
        <SceneArrow
          key={arrow.id}
          vector={arrow.vector}
          color={arrow.color}
          opacity={arrow.opacity}
          from={arrow.from}
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        zoomSpeed={0.8}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.9}
        minDistance={2.6}
        maxDistance={5.2}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI - 0.18}
        target={[0, 0, 0]}
        autoRotate={autoRotate}
        autoRotateSpeed={0.55}
      />
    </>
  );
}

export default function BlochScene({ arrows, showLabels, autoRotate, palette }: SceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [2.6, -2.35, 1.85], fov: 42, near: 0.1, far: 100, up: [0, 0, 1] }}
      style={{ background: "transparent", touchAction: "none" }}
      onCreated={({ camera }) => {
        // Garantiza que el eje Z de la esfera sea "arriba" aunque el prop falle.
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
      }}
    >
      <Scene arrows={arrows} showLabels={showLabels} autoRotate={autoRotate} palette={palette} />
    </Canvas>
  );
}
