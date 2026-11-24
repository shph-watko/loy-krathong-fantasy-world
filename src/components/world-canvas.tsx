"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AvatarSettings, KrathongSettings } from "@/lib/types/festival";
import type { RemotePlayer } from "@/lib/supabase/room-presence";

export type WorldCanvasProps = {
  avatar: AvatarSettings;
  krathong: KrathongSettings;
  moveDirection: { x: number; z: number };
  cameraAngle: number;
  hasFloated: boolean;
  reducedMotion: boolean;
  graphicsQuality: "low" | "balanced" | "high";
  remotePlayers: RemotePlayer[];
  onPositionChange: (position: { x: number; z: number }) => void;
};

type PlayerProps = {
  avatar: AvatarSettings;
  playerRef: React.RefObject<THREE.Group | null>;
  moveDirection: { x: number; z: number };
  cameraAngle: number;
  reducedMotion: boolean;
  onPositionChange: (position: { x: number; z: number }) => void;
};

function WaterSurface() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} receiveShadow>
        <planeGeometry args={[100, 100, 48, 48]} />
        <meshStandardMaterial
          color="#0c3448"
          metalness={0.48}
          roughness={0.22}
          emissive="#061c2c"
          emissiveIntensity={0.2}
        />
      </mesh>
      {Array.from({ length: 18 }, (_, index) => {
        const x = (index % 6) * 3.2 - 8;
        const z = Math.floor(index / 6) * 3.4 - 1.8;
        return (
          <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.265, z]}>
            <ringGeometry args={[0.18, 0.2, 32]} />
            <meshBasicMaterial color="#6c9ba5" transparent opacity={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

function Temple() {
  const columns = [-2.1, -0.7, 0.7, 2.1];

  return (
    <group position={[0, 0, -7.2]}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.2, 0.32, 5.2]} />
        <meshStandardMaterial color="#7f624b" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <boxGeometry args={[6.4, 0.16, 4.5]} />
        <meshStandardMaterial color="#d7c39c" roughness={0.82} />
      </mesh>
      {columns.map((x) => (
        <group key={x}>
          {[-1.55, 1.55].map((z) => (
            <mesh key={z} position={[x, 1.18, z]} castShadow>
              <cylinderGeometry args={[0.14, 0.18, 1.65, 10]} />
              <meshStandardMaterial color="#e4c78b" metalness={0.25} roughness={0.55} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[5.2, 0.34, 3.7]} />
        <meshStandardMaterial color="#8f403c" roughness={0.66} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[4.75, 0.72, 3.35]} />
        <meshStandardMaterial color="#bd8b4c" metalness={0.15} roughness={0.58} />
      </mesh>
      <mesh position={[0, 2.62, -0.1]} castShadow>
        <coneGeometry args={[2.9, 1.12, 4]} />
        <meshStandardMaterial color="#862f39" roughness={0.56} />
      </mesh>
      <mesh position={[0, 3.35, -0.1]} castShadow>
        <coneGeometry args={[2.25, 0.95, 4]} />
        <meshStandardMaterial color="#c9954d" metalness={0.18} roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.02, -0.1]} castShadow>
        <coneGeometry args={[1.58, 0.78, 4]} />
        <meshStandardMaterial color="#8b3440" roughness={0.55} />
      </mesh>
      <mesh position={[0, 4.65, -0.1]} castShadow>
        <coneGeometry args={[0.9, 0.78, 4]} />
        <meshStandardMaterial color="#dbb46c" metalness={0.28} roughness={0.45} />
      </mesh>
      <mesh position={[0, 5.22, -0.1]}>
        <cylinderGeometry args={[0.045, 0.09, 0.55, 8]} />
        <meshStandardMaterial color="#e4c98d" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 1.1, 1.91]}>
        <boxGeometry args={[1.4, 1.4, 0.08]} />
        <meshStandardMaterial color="#173447" emissive="#0b2230" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.48, 3.08]} castShadow>
        <boxGeometry args={[2.5, 0.18, 1.6]} />
        <meshStandardMaterial color="#a78c67" />
      </mesh>
      <mesh position={[0, 0.67, 3.65]} castShadow>
        <boxGeometry args={[2.0, 0.16, 0.65]} />
        <meshStandardMaterial color="#b9a077" />
      </mesh>
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 1.6, 8]} />
        <meshStandardMaterial color="#533c31" roughness={1} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.85, 16, 14]} />
        <meshStandardMaterial color="#315c4a" roughness={0.92} />
      </mesh>
      <mesh position={[-0.38, 1.55, 0.12]} castShadow>
        <sphereGeometry args={[0.48, 12, 12]} />
        <meshStandardMaterial color="#416b4e" roughness={0.94} />
      </mesh>
      <mesh position={[0.42, 1.62, -0.08]} castShadow>
        <sphereGeometry args={[0.52, 12, 12]} />
        <meshStandardMaterial color="#294f43" roughness={0.94} />
      </mesh>
    </group>
  );
}

function Lantern({ position, index }: { position: [number, number, number]; index: number }) {
  const lanternRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!lanternRef.current) return;
    const phase = clock.elapsedTime * 0.6 + index * 1.2;
    lanternRef.current.position.y = position[1] + Math.sin(phase) * 0.12;
    lanternRef.current.rotation.z = Math.sin(phase * 0.6) * 0.05;
  });

  return (
    <group ref={lanternRef} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color="#f0b76d"
          emissive="#e88d3d"
          emissiveIntensity={1.35}
          roughness={0.38}
        />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <coneGeometry args={[0.1, 0.17, 8]} />
        <meshStandardMaterial color="#8b4a37" />
      </mesh>
      <pointLight color="#f6b96d" intensity={0.55} distance={3.2} />
    </group>
  );
}

function Lotus({ position, color = "#d88cae" }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh
          key={index}
          position={[
            Math.cos((index / 7) * Math.PI * 2) * 0.22,
            0.02,
            Math.sin((index / 7) * Math.PI * 2) * 0.22
          ]}
          rotation={[0, -(index / 7) * Math.PI * 2, 0.3]}
        >
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color={color} roughness={0.62} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#e9c47c" />
      </mesh>
    </group>
  );
}

function KrathongModel({
  settings,
  position,
  scale = 1,
  animated = true
}: {
  settings: KrathongSettings;
  position: [number, number, number];
  scale?: number;
  animated?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!animated || !groupRef.current) return;
    groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.85) * 0.04;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.08;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.58, 0.36, 0.17, 9]} />
        <meshStandardMaterial color={settings.baseColor} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.47, 0.34, 0.06, 9]} />
        <meshStandardMaterial color="#314d3d" roughness={0.88} />
      </mesh>
      {Array.from({ length: settings.flowerCount }, (_, index) => {
        const angle = (index / settings.flowerCount) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.34, 0.19, Math.sin(angle) * 0.34]}
            rotation={[0, -angle, 0.35]}
          >
            <sphereGeometry args={[0.17, 10, 10]} />
            <meshStandardMaterial color={settings.flowerColor} roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.055, 0.08, 0.15, 8]} />
        <meshStandardMaterial color="#e9d69d" />
      </mesh>
      {Array.from({ length: settings.candleCount }, (_, index) => (
        <group key={index} position={[((index % 3) - 1) * 0.13, 0.35, Math.floor(index / 3) * 0.13]}>
          <mesh>
            <cylinderGeometry args={[0.035, 0.035, 0.18, 8]} />
            <meshStandardMaterial color="#f5e8bd" />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#ffd38a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Player({
  avatar,
  playerRef,
  moveDirection,
  cameraAngle,
  reducedMotion,
  onPositionChange
}: PlayerProps) {
  const pressedKeys = useRef(new Set<string>());
  const facing = useRef(0);
  const lastPositionBroadcast = useRef(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        pressedKeys.current.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => pressedKeys.current.delete(event.key.toLowerCase());
    const onBlur = () => pressedKeys.current.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useFrame((state, delta) => {
    const player = playerRef.current;
    if (!player) return;

    const keys = pressedKeys.current;
    const x =
      moveDirection.x +
      (keys.has("a") || keys.has("arrowleft") ? -1 : 0) +
      (keys.has("d") || keys.has("arrowright") ? 1 : 0);
    const z =
      moveDirection.z +
      (keys.has("w") || keys.has("arrowup") ? -1 : 0) +
      (keys.has("s") || keys.has("arrowdown") ? 1 : 0);

    const direction = new THREE.Vector3(x, 0, z);
    if (direction.lengthSq() > 0) {
      direction.normalize();
      player.position.addScaledVector(direction, Math.min(delta, 0.04) * 3.2);
      facing.current = Math.atan2(direction.x, direction.z);
      player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, facing.current, 0.18);
      player.position.x = THREE.MathUtils.clamp(player.position.x, -5.2, 5.2);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -0.2, 5.4);
    }

    if (!reducedMotion) {
      player.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.025;
    }

    const cameraOffset = new THREE.Vector3(
      Math.sin(cameraAngle) * 10.5,
      8.4,
      Math.cos(cameraAngle) * 11.5
    );
    const desired = player.position.clone().add(cameraOffset);
    state.camera.position.lerp(desired, 1 - Math.exp(-delta * 1.45));
    state.camera.lookAt(player.position.x, 0.75, player.position.z - 1.2);

    if (state.clock.elapsedTime - lastPositionBroadcast.current > 0.25) {
      onPositionChange({ x: player.position.x, z: player.position.z });
      lastPositionBroadcast.current = state.clock.elapsedTime;
    }
  });

  return (
    <group ref={playerRef} position={[0, 0, 2.6]}>
      <mesh position={[0, 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.42, 0.92, 12]} />
        <meshStandardMaterial color={avatar.outfitColor} roughness={0.78} />
      </mesh>
      <mesh position={[0, 1.43, 0]} castShadow>
        <sphereGeometry args={[0.31, 16, 16]} />
        <meshStandardMaterial color={avatar.skinTone} roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.6, -0.025]} castShadow>
        <sphereGeometry args={[0.32, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={avatar.hairColor} roughness={0.88} />
      </mesh>
      <mesh position={[-0.39, 0.85, 0]} rotation={[0, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.1, 0.52, 4, 8]} />
        <meshStandardMaterial color={avatar.skinTone} />
      </mesh>
      <mesh position={[0.39, 0.85, 0]} rotation={[0, 0, 0.15]} castShadow>
        <capsuleGeometry args={[0.1, 0.52, 4, 8]} />
        <meshStandardMaterial color={avatar.skinTone} />
      </mesh>
      <mesh position={[-0.17, 0.22, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.38, 4, 8]} />
        <meshStandardMaterial color="#302a35" />
      </mesh>
      <mesh position={[0.17, 0.22, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.38, 4, 8]} />
        <meshStandardMaterial color="#302a35" />
      </mesh>
    </group>
  );
}

function RemoteAvatar({ player }: { player: RemotePlayer }) {
  return (
    <group position={[player.x, 0, player.z]}>
      <mesh position={[0, 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.42, 0.92, 12]} />
        <meshStandardMaterial color={player.outfitColor} roughness={0.78} />
      </mesh>
      <mesh position={[0, 1.43, 0]} castShadow>
        <sphereGeometry args={[0.31, 14, 14]} />
        <meshStandardMaterial color="#d9a47f" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.6, -0.02]}>
        <sphereGeometry args={[0.32, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#272333" roughness={0.86} />
      </mesh>
    </group>
  );
}

function WorldScene({
  avatar,
  krathong,
  moveDirection,
  cameraAngle,
  hasFloated,
  reducedMotion,
  remotePlayers,
  onPositionChange
}: WorldCanvasProps) {
  const playerRef = useRef<THREE.Group>(null);

  return (
    <>
      <color attach="background" args={["#071627"]} />
      <fog attach="fog" args={["#071627", 20, 55]} />
      <ambientLight intensity={0.82} color="#b8d6de" />
      <hemisphereLight args={["#c9ddeb", "#172b2c", 0.75]} />
      <directionalLight
        position={[-8, 14, 5]}
        intensity={2.1}
        color="#ffe0b2"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 8, -7]} intensity={1.7} color="#f0bc7d" distance={24} />
      <WaterSurface />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, -2.2]} receiveShadow>
        <planeGeometry args={[4.4, 13]} />
        <meshStandardMaterial color="#78634e" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.02, -7.2]} receiveShadow>
        <cylinderGeometry args={[4.1, 4.3, 0.16, 48]} />
        <meshStandardMaterial color="#385a46" roughness={0.96} />
      </mesh>

      <Temple />
      <Tree position={[-4.5, 0, -5.6]} scale={1.15} />
      <Tree position={[4.5, 0, -5.3]} scale={1.1} />
      <Tree position={[-5.2, 0, -1.1]} scale={0.88} />
      <Tree position={[5.0, 0, -0.8]} scale={0.95} />
      <Tree position={[-4.3, 0, 3.2]} scale={0.72} />
      <Tree position={[4.2, 0, 3.7]} scale={0.78} />

      <mesh position={[0, 0.18, -3.5]} castShadow>
        <boxGeometry args={[5.2, 0.18, 0.8]} />
        <meshStandardMaterial color="#a9875b" />
      </mesh>
      {Array.from({ length: 9 }, (_, index) => (
        <mesh key={index} position={[-1.95 + index * 0.49, 0.29, -3.5]}>
          <boxGeometry args={[0.035, 0.04, 0.76]} />
          <meshStandardMaterial color="#594532" />
        </mesh>
      ))}

      <Lantern position={[-4.8, 4.2, -2.5]} index={0} />
      <Lantern position={[-3.4, 5.1, -8.5]} index={1} />
      <Lantern position={[3.3, 4.7, -8.0]} index={2} />
      <Lantern position={[4.8, 3.8, -2.2]} index={3} />
      <Lantern position={[-2.9, 3.6, 2.0]} index={4} />
      <Lantern position={[3.0, 4.4, 1.8]} index={5} />

      <Lotus position={[-3.1, -0.12, 1.2]} />
      <Lotus position={[3.2, -0.12, 1.8]} color="#e8c17d" />
      <Lotus position={[-4.4, -0.12, -3.0]} color="#d6a1b8" />
      <KrathongModel settings={krathong} position={[1.25, -0.08, 3.7]} scale={0.82} />
      {hasFloated && (
        <KrathongModel settings={krathong} position={[-1.2, -0.08, 4.3]} scale={0.94} />
      )}

      <mesh position={[0, 7.8, -18]} rotation={[0.1, 0, 0]}>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial color="#e7d8ba" />
      </mesh>
      <mesh position={[0, 7.8, -18]}>
        <sphereGeometry args={[2.6, 24, 24]} />
        <meshBasicMaterial color="#e7d8ba" transparent opacity={0.08} />
      </mesh>

      {remotePlayers.map((remote) => (
        <RemoteAvatar key={remote.userId} player={remote} />
      ))}
      <Player
        avatar={avatar}
        playerRef={playerRef}
        moveDirection={moveDirection}
        cameraAngle={cameraAngle}
        reducedMotion={reducedMotion}
        onPositionChange={onPositionChange}
      />
    </>
  );
}

export default function WorldCanvas(props: WorldCanvasProps) {
  const dpr: [number, number] =
    props.graphicsQuality === "low" ? [1, 1] : props.graphicsQuality === "high" ? [1, 2] : [1, 1.5];

  return (
    <Canvas
      shadows={props.graphicsQuality !== "low"}
      dpr={dpr}
      camera={{ position: [10, 9, 13], fov: 39, near: 0.1, far: 100 }}
      gl={{
        antialias: props.graphicsQuality !== "low",
        preserveDrawingBuffer: true,
        alpha: false,
        powerPreference: "high-performance"
      }}
      className="world-canvas"
    >
      <WorldScene {...props} />
    </Canvas>
  );
}
