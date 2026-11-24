export type ActivePanel =
  | "world"
  | "avatar"
  | "krathong"
  | "ceremony"
  | "friends"
  | "album"
  | "settings";

export type AvatarSettings = {
  displayName: string;
  outfitColor: string;
  skinTone: string;
  hairColor: string;
};

export type KrathongSettings = {
  designName: string;
  baseColor: string;
  flowerColor: string;
  flowerCount: number;
  candleCount: number;
  incenseCount: number;
};

export type FestivalWish = {
  id: string;
  body: string;
  visibility: "private" | "public";
  createdAt: string;
};

export type FestivalPhoto = {
  id: string;
  blob: Blob;
  createdAt: string;
};

export type GraphicsQuality = "low" | "balanced" | "high";

export type FestivalPreferences = {
  soundEnabled: boolean;
  reducedMotion: boolean;
  graphicsQuality: GraphicsQuality;
};

export const DEFAULT_AVATAR: AvatarSettings = {
  displayName: "ผู้มาเยือน",
  outfitColor: "#b88b52",
  skinTone: "#d9a47f",
  hairColor: "#272333"
};

export const DEFAULT_KRATHONG: KrathongSettings = {
  designName: "บัวจันทร์",
  baseColor: "#a66a3f",
  flowerColor: "#e9a2bf",
  flowerCount: 8,
  candleCount: 1,
  incenseCount: 3
};

export const DEFAULT_PREFERENCES: FestivalPreferences = {
  soundEnabled: false,
  reducedMotion: false,
  graphicsQuality: "balanced"
};

export const AVATAR_COLORS = [
  "#b88b52",
  "#325d68",
  "#7b536e",
  "#6b7650",
  "#8c5550",
  "#5f668d"
];

export const FLOWER_COLORS = [
  "#e9a2bf",
  "#f3d6a0",
  "#f1eee6",
  "#bd91d2",
  "#e27e68",
  "#9fbf9b"
];

export const SKIN_TONES = [
  "#f1c9a6",
  "#d9a47f",
  "#bd805e",
  "#8c563e",
  "#684333"
];
