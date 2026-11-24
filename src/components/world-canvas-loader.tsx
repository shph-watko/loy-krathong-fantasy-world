"use client";

import dynamic from "next/dynamic";
import type { AvatarSettings, KrathongSettings } from "@/lib/types/festival";

type Props = {
  avatar: AvatarSettings;
  krathong: KrathongSettings;
  moveDirection: { x: number; z: number };
  cameraAngle: number;
  hasFloated: boolean;
  reducedMotion: boolean;
  graphicsQuality: "low" | "balanced" | "high";
};

const WorldCanvas = dynamic(
  () => import("@/components/world-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="scene-loading">
        <span className="loading-orbit" />
        <p>กำลังเตรียมโลกเทศกาลสามมิติ</p>
      </div>
    )
  }
);

export default function WorldCanvasLoader(props: Props) {
  return <WorldCanvas {...props} />;
}
