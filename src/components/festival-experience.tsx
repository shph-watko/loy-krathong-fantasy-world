"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { CSSProperties } from "react";
import WorldCanvasLoader from "@/components/world-canvas-loader";
import AccountControl from "@/components/account-control";
import type { RemotePlayer, RoomPresenceConnection } from "@/lib/supabase/room-presence";
import { subscribeToRoomPresence } from "@/lib/supabase/room-presence";
import {
  loadCloudAvatar,
  saveCloudAvatar,
  saveCloudKrathong,
  saveCloudWish,
  uploadPhotoToCloud
} from "@/lib/supabase/user-data";
import {
  createOnlineInvitation,
  createOnlineRoom,
  joinOnlineRoomByInvite,
  joinPublicRoomByCode
} from "@/lib/supabase/rooms";
import {
  AVATAR_COLORS,
  DEFAULT_AVATAR,
  DEFAULT_KRATHONG,
  DEFAULT_PREFERENCES,
  FLOWER_COLORS,
  SKIN_TONES
} from "@/lib/types/festival";
import type {
  ActivePanel,
  AvatarSettings,
  FestivalPhoto,
  FestivalPreferences,
  FestivalWish,
  KrathongSettings
} from "@/lib/types/festival";
import {
  deletePhoto,
  listPhotos,
  readLocalValue,
  saveAvatar,
  saveKrathong,
  savePhoto,
  savePreferences,
  saveWishes,
  writeLocalValue
} from "@/lib/storage/browser-store";

const NAV_ITEMS: { id: ActivePanel; title: string; subtitle: string }[] = [
  { id: "world", title: "โลกเทศกาล", subtitle: "สำรวจพื้นที่" },
  { id: "avatar", title: "ตัวละครของฉัน", subtitle: "รูปลักษณ์และชุด" },
  { id: "krathong", title: "ออกแบบกระทง", subtitle: "สร้างผลงานของคุณ" },
  { id: "ceremony", title: "พิธีลอยกระทง", subtitle: "คำอธิษฐานและสายน้ำ" },
  { id: "friends", title: "เชิญเพื่อน", subtitle: "ห้องและรหัสเชิญ" },
  { id: "album", title: "อัลบั้มภาพ", subtitle: "ภาพที่บันทึกไว้" },
  { id: "settings", title: "การตั้งค่า", subtitle: "ภาพและการเคลื่อนไหว" }
];

const PANEL_TITLES: Record<ActivePanel, string> = {
  world: "พื้นที่จัดงาน",
  avatar: "ปรับแต่งตัวละคร",
  krathong: "ห้องออกแบบกระทง",
  ceremony: "พิธีลอยกระทง",
  friends: "เชิญเพื่อนเข้าร่วม",
  album: "อัลบั้มภาพของฉัน",
  settings: "การตั้งค่าประสบการณ์"
};

function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function ColorChoices({
  colors,
  value,
  onChange,
  label
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  return (
    <div className="field-block">
      <span className="field-label">{label}</span>
      <div className="color-options" role="group" aria-label={label}>
        {colors.map((color) => (
          <button
            type="button"
            className={`color-swatch ${value === color ? "is-selected" : ""}`}
            style={{ "--swatch-color": color } as CSSProperties}
            key={color}
            aria-label={`เลือกสี ${color}`}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="number-control">
      <span>{label}</span>
      <div className="stepper">
        <button
          type="button"
          aria-label={`ลด${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <strong>{value}</strong>
        <button
          type="button"
          aria-label={`เพิ่ม${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function FestivalExperience() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("world");
  const [avatar, setAvatar] = useState<AvatarSettings>(DEFAULT_AVATAR);
  const [krathong, setKrathong] = useState<KrathongSettings>(DEFAULT_KRATHONG);
  const [preferences, setPreferences] = useState<FestivalPreferences>(DEFAULT_PREFERENCES);
  const [wishes, setWishes] = useState<FestivalWish[]>([]);
  const [photos, setPhotos] = useState<FestivalPhoto[]>([]);
  const [savedDesigns, setSavedDesigns] = useState<KrathongSettings[]>([]);
  const [newWish, setNewWish] = useState("");
  const [wishVisibility, setWishVisibility] = useState<"private" | "public">("private");
  const [inviteCode, setInviteCode] = useState("");
  const [roomVisibility, setRoomVisibility] = useState<"private" | "public">("private");
  const [joinCode, setJoinCode] = useState("");
  const [cameraAngle, setCameraAngle] = useState(0.42);
  const [moveDirection, setMoveDirection] = useState({ x: 0, z: 0 });
  const [hasFloated, setHasFloated] = useState(false);
  const [notice, setNotice] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [roomLink, setRoomLink] = useState("");
  const currentUserId = currentUser?.id ?? null;
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [uploadedPhotoIds, setUploadedPhotoIds] = useState<string[]>([]);
  const cloudAvatarLoadedForRef = useRef<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null);
  const [pendingInvite, setPendingInvite] = useState("");
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  const presenceConnectionRef = useRef<RoomPresenceConnection | null>(null);

  const handleAccountChange = useCallback((user: { id: string; email: string | null } | null) => {
    setCurrentUser(user);
  }, []);

  const publishPosition = useCallback((position: { x: number; z: number }) => {
    presenceConnectionRef.current?.publishPosition(position);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const localAvatar = readLocalValue("avatar", DEFAULT_AVATAR);
    const localKrathong = readLocalValue("krathong", DEFAULT_KRATHONG);
    const localPreferences = readLocalValue("preferences", DEFAULT_PREFERENCES);
    const localWishes = readLocalValue("wishes", [] as FestivalWish[]);
    const localDesigns = readLocalValue("designs", [] as KrathongSettings[]);

    const parameters = new URLSearchParams(window.location.search);
    const incomingCode = parameters.get("room");
    const incomingInvite = parameters.get("invite");

    queueMicrotask(() => {
      if (cancelled) return;
      setAvatar(localAvatar);
      setKrathong(localKrathong);
      setPreferences(localPreferences);
      setWishes(localWishes);
      setSavedDesigns(localDesigns);
      if (incomingCode) {
        setJoinCode(incomingCode.toUpperCase().slice(0, 6));
        setActivePanel("friends");
      }
      if (incomingInvite) {
        setPendingInvite(incomingInvite);
        setActivePanel("friends");
      }
      setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    saveAvatar(avatar);
  }, [avatar, isReady]);

  useEffect(() => {
    if (!currentUserId) {
      cloudAvatarLoadedForRef.current = null;
      return;
    }
    if (cloudAvatarLoadedForRef.current === currentUserId) return;

    let cancelled = false;
    loadCloudAvatar()
      .then((cloudAvatar) => {
        if (cancelled) return;
        if (cloudAvatar) setAvatar(cloudAvatar);
        cloudAvatarLoadedForRef.current = currentUserId;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        cloudAvatarLoadedForRef.current = currentUserId;
        setNotice(error instanceof Error ? error.message : "ไม่สามารถโหลดตัวละครจากฐานข้อมูลได้");
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!isReady || !currentUserId || cloudAvatarLoadedForRef.current !== currentUserId) return;
    const timer = window.setTimeout(() => {
      saveCloudAvatar(avatar).catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "บันทึกตัวละครออนไลน์ไม่สำเร็จ");
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [avatar, currentUserId, isReady]);

  useEffect(() => {
    if (!isReady) return;
    saveKrathong(krathong);
  }, [krathong, isReady]);

  useEffect(() => {
    if (!isReady) return;
    savePreferences(preferences);
  }, [preferences, isReady]);

  useEffect(() => {
    if (!isReady) return;
    saveWishes(wishes);
  }, [wishes, isReady]);

  useEffect(() => {
    if (!pendingInvite || !currentUser) return;
    let cancelled = false;

    joinOnlineRoomByInvite(pendingInvite)
      .then((roomId) => {
        if (cancelled) return;
        setOnlineRoomId(roomId);
        setPendingInvite("");
        setNotice("เข้าร่วมห้องออนไลน์แล้ว");
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", url.toString());
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPendingInvite("");
          setNotice(error instanceof Error ? error.message : "ไม่สามารถเข้าร่วมห้องจากลิงก์นี้ได้");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pendingInvite, currentUser]);

  useEffect(() => {
    if (!onlineRoomId || !currentUser) {
      presenceConnectionRef.current?.close();
      presenceConnectionRef.current = null;
      return;
    }

    const connection = subscribeToRoomPresence(
      onlineRoomId,
      {
        id: currentUser.id,
        displayName: avatar.displayName,
        outfitColor: avatar.outfitColor
      },
      setRemotePlayers
    );

    if (!connection) {
      setNotice("ไม่สามารถเริ่มการเชื่อมต่อแบบเรียลไทม์ได้");
      return;
    }

    presenceConnectionRef.current = connection;
    return () => {
      connection.close();
      if (presenceConnectionRef.current === connection) {
        presenceConnectionRef.current = null;
      }
    };
  }, [onlineRoomId, currentUser, avatar.displayName, avatar.outfitColor]);

  useEffect(() => {
    if (activePanel !== "album") return;
    let cancelled = false;

    listPhotos()
      .then((stored) => {
        if (!cancelled) setPhotos(stored);
      })
      .catch((error: unknown) => {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "ไม่สามารถเปิดอัลบั้มภาพได้");
      });

    return () => {
      cancelled = true;
    };
  }, [activePanel]);

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    photos.forEach((photo) => {
      nextUrls[photo.id] = URL.createObjectURL(photo.blob);
    });
    const frame = window.requestAnimationFrame(() => setPhotoUrls(nextUrls));

    return () => {
      window.cancelAnimationFrame(frame);
      Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const photoCountLabel = useMemo(
    () => `${photos.length} ภาพที่บันทึกในอุปกรณ์นี้`,
    [photos.length]
  );

  const visibleRemotePlayers = onlineRoomId && currentUser ? remotePlayers : [];

  const updateAvatar = <K extends keyof AvatarSettings>(key: K, value: AvatarSettings[K]) => {
    setAvatar((current) => ({ ...current, [key]: value }));
  };

  const updateKrathong = <K extends keyof KrathongSettings>(
    key: K,
    value: KrathongSettings[K]
  ) => {
    setKrathong((current) => ({ ...current, [key]: value }));
  };

  const saveCurrentDesign = async () => {
    const nextDesigns = [
      krathong,
      ...savedDesigns.filter((item) => item.designName !== krathong.designName)
    ].slice(0, 12);
    setSavedDesigns(nextDesigns);
    writeLocalValue("designs", nextDesigns);

    if (!currentUser) {
      setNotice("บันทึกแบบกระทงไว้ในอุปกรณ์นี้แล้ว เข้าสู่ระบบเพื่อสำรองไว้บนคลาวด์");
      return;
    }
    try {
      await saveCloudKrathong(krathong);
      setNotice("บันทึกแบบกระทงในอุปกรณ์และบัญชีออนไลน์แล้ว");
    } catch (error) {
      setNotice(error instanceof Error
        ? `บันทึกในอุปกรณ์แล้ว แต่สำรองออนไลน์ไม่สำเร็จ: ${error.message}`
        : "บันทึกในอุปกรณ์แล้ว แต่สำรองออนไลน์ไม่สำเร็จ");
    }
  };

  const createInvite = async () => {
    if (!currentUser) {
      const code = makeInviteCode();
      const url = new URL(window.location.href);
      url.searchParams.set("room", code);
      setInviteCode(code);
      setRoomLink(url.toString());
      setNotice("สร้างรหัสตัวอย่างแล้ว หากต้องการห้องออนไลน์จริงให้เข้าสู่ระบบก่อน");
      return;
    }

    try {
      const room = await createOnlineRoom(roomVisibility);
      const token = await createOnlineInvitation(room.id);
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      url.searchParams.set("invite", token);
      setOnlineRoomId(room.id);
      setInviteCode(room.code);
      setRoomLink(url.toString());

      try {
        await navigator.clipboard.writeText(url.toString());
        setNotice("สร้างห้องออนไลน์และคัดลอกลิงก์เชิญแล้ว");
      } catch {
        setNotice("สร้างห้องออนไลน์แล้ว สามารถคัดลอกลิงก์จากช่องด้านล่าง");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "สร้างห้องออนไลน์ไม่สำเร็จ");
    }
  };

  const joinRoom = async () => {
    const normalized = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setNotice("กรุณากรอกรหัสห้อง 6 ตัวอักษร");
      return;
    }
    if (!currentUser) {
      setNotice("กรุณาเข้าสู่ระบบก่อนเข้าร่วมห้องออนไลน์");
      return;
    }
    try {
      const roomId = await joinPublicRoomByCode(normalized);
      setOnlineRoomId(roomId);
      setNotice("เข้าร่วมห้องออนไลน์แล้ว");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ไม่สามารถเข้าร่วมห้องได้");
    }
  };

  const copyInviteLink = async () => {
    if (!navigator.clipboard) {
      setNotice("เบราว์เซอร์นี้ไม่รองรับการคัดลอกอัตโนมัติ กรุณาคัดลอกลิงก์จากช่องข้อความ");
      return;
    }
    try {
      await navigator.clipboard.writeText(roomLink);
      setNotice("คัดลอกลิงก์แล้ว");
    } catch {
      setNotice("คัดลอกลิงก์ไม่สำเร็จ กรุณาคัดลอกจากช่องข้อความ");
    }
  };

  const createWishAndFloat = async () => {
    const body = newWish.trim();
    if (!body) {
      setNotice("กรุณาเขียนคำอธิษฐานก่อนเริ่มพิธี");
      return;
    }
    if (body.length > 240) {
      setNotice("คำอธิษฐานต้องไม่เกิน 240 ตัวอักษร");
      return;
    }

    const wish: FestivalWish = {
      id: crypto.randomUUID(),
      body,
      visibility: wishVisibility,
      createdAt: new Date().toISOString()
    };
    setWishes((current) => [wish, ...current].slice(0, 50));
    setNewWish("");
    setHasFloated(true);

    if (!currentUser) {
      setNotice("บันทึกคำอธิษฐานในอุปกรณ์และเพิ่มกระทงลงในฉากแล้ว");
      return;
    }
    try {
      await saveCloudWish(wish);
      setNotice(wish.visibility === "public"
        ? "บันทึกคำอธิษฐานออนไลน์แล้ว และส่งเข้าคิวตรวจสอบก่อนแสดงสาธารณะ"
        : "บันทึกคำอธิษฐานส่วนตัวออนไลน์แล้ว");
    } catch (error) {
      setNotice(error instanceof Error
        ? `บันทึกในอุปกรณ์แล้ว แต่บันทึกออนไลน์ไม่สำเร็จ: ${error.message}`
        : "บันทึกในอุปกรณ์แล้ว แต่บันทึกออนไลน์ไม่สำเร็จ");
    }
  };

  const captureScene = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(".scene-canvas canvas");
    if (!canvas) {
      setNotice("ยังไม่พบฉากสำหรับถ่ายภาพ");
      return;
    }

    setIsCapturing(true);
    canvas.toBlob(
      async (blob) => {
        try {
          if (!blob) throw new Error("ไม่สามารถสร้างไฟล์ภาพได้");
          await savePhoto(blob);
          const stored = await listPhotos();
          setPhotos(stored);
          setNotice("บันทึกภาพลงอัลบั้มในอุปกรณ์นี้แล้ว");
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "บันทึกภาพไม่สำเร็จ");
        } finally {
          setIsCapturing(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const uploadPhoto = async (photo: FestivalPhoto) => {
    if (!currentUser) {
      setNotice("กรุณาเข้าสู่ระบบก่อนสำรองภาพออนไลน์");
      return;
    }
    setUploadingPhotoId(photo.id);
    try {
      await uploadPhotoToCloud(photo.blob);
      setUploadedPhotoIds((current) => [...current, photo.id]);
      setNotice("อัปโหลดภาพไปยังพื้นที่ส่วนตัวของบัญชีแล้ว");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "อัปโหลดภาพไม่สำเร็จ");
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const removePhoto = async (id: string) => {
    try {
      await deletePhoto(id);
      setPhotos((current) => current.filter((photo) => photo.id !== id));
      setNotice("ลบภาพออกจากอัลบั้มแล้ว");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ลบภาพไม่สำเร็จ");
    }
  };

  const changePanel = (panel: ActivePanel) => {
    setActivePanel(panel);
    setNotice("");
  };

  const panelContent = () => {
    if (activePanel === "world") {
      return (
        <div className="panel-stack">
          <section className="welcome-card">
            <span className="eyebrow">FESTIVAL WORLD</span>
            <h3>ค่ำคืนริมสายน้ำ</h3>
            <p>
              เดินสำรวจลานพิธี ชมศาลาแสงจันทร์ และเตรียมกระทงของคุณก่อนร่วมพิธีริมแม่น้ำ
            </p>
            <div className="welcome-stats">
              <div><strong>01</strong><span>พื้นที่หลัก</span></div>
              <div><strong>3D</strong><span>โลกสามมิติ</span></div>
              <div><strong>24/7</strong><span>เข้าชมได้</span></div>
            </div>
          </section>
          <section className="panel-section">
            <div className="section-heading">
              <h4>สถานที่แนะนำ</h4>
              <span>จุดสำรวจ</span>
            </div>
            <button className="location-row" type="button" onClick={() => setNotice("คุณอยู่ในบริเวณลานพิธีหลัก")}>
              <span className="location-index">01</span>
              <span><strong>ลานพิธีริมแม่น้ำ</strong><small>จุดเริ่มต้นของเทศกาล</small></span>
              <span className="row-arrow">›</span>
            </button>
            <button className="location-row" type="button" onClick={() => setNotice("สะพานจันทร์จะเพิ่มในฉากถัดไป")}>
              <span className="location-index">02</span>
              <span><strong>สะพานจันทร์</strong><small>จุดชมแสงสะท้อนผิวน้ำ</small></span>
              <span className="row-arrow">›</span>
            </button>
            <button className="location-row" type="button" onClick={() => setNotice("สวนบัวจะเพิ่มในฉากถัดไป")}>
              <span className="location-index">03</span>
              <span><strong>สวนบัว</strong><small>มุมพักผ่อนใต้แสงโคม</small></span>
              <span className="row-arrow">›</span>
            </button>
          </section>
          <section className="tip-card">
            <span className="tip-mark">TIP</span>
            <p>ใช้ปุ่มลูกศรบนหน้าจอ หรือปุ่ม W A S D เพื่อเคลื่อนที่ในฉาก</p>
          </section>
        </div>
      );
    }

    if (activePanel === "avatar") {
      return (
        <div className="panel-stack">
          <div className="avatar-preview">
            <div className="avatar-preview-head" style={{ background: avatar.skinTone }}>
              <span style={{ background: avatar.hairColor }} />
            </div>
            <div className="avatar-preview-body" style={{ background: avatar.outfitColor }} />
            <strong>{avatar.displayName || "ผู้มาเยือน"}</strong>
            <small>ตัวละครของคุณ</small>
          </div>
          <section className="panel-section">
            <label className="field-label" htmlFor="avatar-name">ชื่อตัวละคร</label>
            <input
              id="avatar-name"
              className="text-input"
              value={avatar.displayName}
              maxLength={24}
              onChange={(event) => updateAvatar("displayName", event.target.value)}
              placeholder="ตั้งชื่อตัวละคร"
            />
            <p className="field-hint">ชื่อแสดงได้สูงสุด 24 ตัวอักษร</p>
          </section>
          <ColorChoices
            label="สีชุด"
            colors={AVATAR_COLORS}
            value={avatar.outfitColor}
            onChange={(value) => updateAvatar("outfitColor", value)}
          />
          <ColorChoices
            label="สีผิว"
            colors={SKIN_TONES}
            value={avatar.skinTone}
            onChange={(value) => updateAvatar("skinTone", value)}
          />
          <div className="field-block">
            <label className="field-label" htmlFor="hair-color">สีผม</label>
            <div className="color-input-row">
              <input
                id="hair-color"
                type="color"
                value={avatar.hairColor}
                onChange={(event) => updateAvatar("hairColor", event.target.value)}
              />
              <span>{avatar.hairColor.toUpperCase()}</span>
            </div>
          </div>
          <p className="subtle-note">การปรับแต่งจะบันทึกไว้ในอุปกรณ์นี้โดยอัตโนมัติ</p>
        </div>
      );
    }

    if (activePanel === "krathong") {
      return (
        <div className="panel-stack">
          <section className="krathong-preview">
            <div className="krathong-preview-bowl" style={{ background: krathong.baseColor }}>
              <div className="krathong-preview-flowers" style={{ color: krathong.flowerColor }}>● ● ●</div>
              <span className="krathong-preview-candle" />
            </div>
            <small>ตัวอย่างแบบกระทงปัจจุบัน</small>
          </section>
          <section className="panel-section">
            <label className="field-label" htmlFor="design-name">ชื่อผลงาน</label>
            <input
              id="design-name"
              className="text-input"
              maxLength={48}
              value={krathong.designName}
              onChange={(event) => updateKrathong("designName", event.target.value)}
            />
          </section>
          <ColorChoices
            label="สีฐานกระทง"
            colors={["#a66a3f", "#c4a46a", "#456e5b", "#72516d", "#4d6c82", "#8c4b43"]}
            value={krathong.baseColor}
            onChange={(value) => updateKrathong("baseColor", value)}
          />
          <ColorChoices
            label="สีดอกไม้"
            colors={FLOWER_COLORS}
            value={krathong.flowerColor}
            onChange={(value) => updateKrathong("flowerColor", value)}
          />
          <section className="panel-section control-list">
            <NumberControl label="จำนวนดอกไม้" value={krathong.flowerCount} min={4} max={12} onChange={(value) => updateKrathong("flowerCount", value)} />
            <NumberControl label="จำนวนเทียน" value={krathong.candleCount} min={0} max={3} onChange={(value) => updateKrathong("candleCount", value)} />
            <NumberControl label="จำนวนธูป" value={krathong.incenseCount} min={0} max={5} onChange={(value) => updateKrathong("incenseCount", value)} />
          </section>
          <button className="primary-button full-button" type="button" onClick={saveCurrentDesign}>บันทึกแบบกระทง</button>
          {savedDesigns.length > 0 && (
            <section className="panel-section">
              <div className="section-heading"><h4>แบบที่บันทึกไว้</h4><span>{savedDesigns.length} แบบ</span></div>
              {savedDesigns.map((design) => (
                <button
                  className="saved-design-row"
                  key={design.designName}
                  type="button"
                  onClick={() => setKrathong(design)}
                >
                  <span className="saved-design-swatch" style={{ background: design.baseColor }} />
                  <span>{design.designName}</span>
                  <span className="row-arrow">›</span>
                </button>
              ))}
            </section>
          )}
        </div>
      );
    }

    if (activePanel === "ceremony") {
      return (
        <div className="panel-stack">
          <section className="ceremony-card">
            <span className="eyebrow">FLOATING CEREMONY</span>
            <h3>ส่งความปรารถนาดีไปกับสายน้ำ</h3>
            <p>เขียนคำอธิษฐานของคุณ แล้วนำกระทงที่ออกแบบไว้ลงลอยในแม่น้ำ</p>
            <div className="ceremony-indicator"><span /> พื้นที่ประกอบพิธีพร้อมใช้งานในโหมดตัวอย่าง</div>
          </section>
          <section className="panel-section">
            <label className="field-label" htmlFor="wish-text">คำอธิษฐาน</label>
            <textarea
              id="wish-text"
              className="text-input text-area"
              value={newWish}
              maxLength={240}
              onChange={(event) => setNewWish(event.target.value)}
              placeholder="เขียนความปรารถนาของคุณ..."
            />
            <div className="textarea-footer"><span>บันทึกในอุปกรณ์นี้</span><span>{newWish.length}/240</span></div>
            <label className="field-label" htmlFor="wish-visibility">การมองเห็น</label>
            <select
              id="wish-visibility"
              className="text-input"
              value={wishVisibility}
              onChange={(event) => setWishVisibility(event.target.value as "private" | "public")}
            >
              <option value="private">ส่วนตัว</option>
              <option value="public">สาธารณะในอัลบั้มนี้</option>
            </select>
            <button className="primary-button full-button" type="button" onClick={createWishAndFloat}>ลอยกระทงของฉัน</button>
          </section>
          <section className="panel-section">
            <div className="section-heading"><h4>คำอธิษฐานที่บันทึกไว้</h4><span>{wishes.length} รายการ</span></div>
            {wishes.length === 0 ? (
              <p className="empty-message">ยังไม่มีคำอธิษฐาน เริ่มเขียนข้อความแรกของคุณได้ที่ด้านบน</p>
            ) : wishes.slice(0, 5).map((wish) => (
              <article className="wish-row" key={wish.id}>
                <p>{wish.body}</p>
                <small>{wish.visibility === "private" ? "ส่วนตัว" : "สาธารณะ"} · {new Date(wish.createdAt).toLocaleDateString("th-TH")}</small>
              </article>
            ))}
          </section>
        </div>
      );
    }

    if (activePanel === "friends") {
      return (
        <div className="panel-stack">
          <section className="welcome-card">
            <span className="eyebrow">INVITE YOUR FRIENDS</span>
            <h3>ร่วมค่ำคืนนี้ด้วยกัน</h3>
            <p>เลือกห้องส่วนตัวที่ใช้ลิงก์เชิญ หรือห้องสาธารณะที่เพื่อนเข้าร่วมได้ด้วยรหัสห้อง</p>
          </section>
          <section className="panel-section">
            <label className="field-label" htmlFor="room-visibility">ประเภทห้อง</label>
            <select
              id="room-visibility"
              className="text-input"
              value={roomVisibility}
              onChange={(event) => setRoomVisibility(event.target.value as "private" | "public")}
            >
              <option value="private">ส่วนตัว — เข้าร่วมด้วยลิงก์เชิญ</option>
              <option value="public">สาธารณะ — เข้าร่วมด้วยรหัสห้องได้</option>
            </select>
            <button className="primary-button full-button" type="button" onClick={createInvite}>สร้างห้องและลิงก์เชิญ</button>
            {inviteCode && (
              <div className="invite-result">
                <span className="field-label">รหัสห้อง {roomVisibility === "public" ? "(ใช้เข้าร่วมได้)" : "(ใช้ร่วมกับลิงก์เชิญ)"}</span>
                <strong className="invite-code">{inviteCode}</strong>
                <label className="field-label" htmlFor="invite-link">ลิงก์สำหรับส่งให้เพื่อน</label>
                <input id="invite-link" className="text-input" readOnly value={roomLink} onFocus={(event) => event.currentTarget.select()} />
                <button className="secondary-button full-button" type="button" onClick={copyInviteLink}>คัดลอกลิงก์อีกครั้ง</button>
              </div>
            )}
          </section>
          <section className="panel-section">
            <h4>เข้าร่วมด้วยรหัส</h4>
            <label className="field-label" htmlFor="join-code">รหัสห้อง 6 ตัวอักษร</label>
            <input
              id="join-code"
              className="text-input invite-input"
              value={joinCode}
              maxLength={6}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="เช่น A7K2Q9"
            />
            <button className="secondary-button full-button" type="button" onClick={joinRoom}>ตรวจสอบรหัส</button>
          </section>
          {onlineRoomId && (
            <section className="panel-section room-presence-card">
              <div className="section-heading"><h4>สมาชิกในห้อง</h4><span>{visibleRemotePlayers.length + 1} คน</span></div>
              <div className="room-member-row"><span className="member-presence-dot" /><strong>{avatar.displayName}</strong><small>คุณ</small></div>
              {visibleRemotePlayers.map((player) => (
                <div className="room-member-row" key={player.userId}>
                  <span className="member-presence-dot" /><strong>{player.displayName}</strong><small>ออนไลน์</small>
                </div>
              ))}
            </section>
          )}
          <p className="subtle-note">
            {currentUser
              ? "เมื่อใช้บัญชีสมาชิกและติดตั้ง SQL migrations แล้ว ระบบจะใช้ Supabase Realtime เพื่อแสดงผู้เล่นในห้องนี้"
              : "ห้องออนไลน์ต้องเข้าสู่ระบบด้วยอีเมลและตั้งค่า Supabase ก่อน ส่วนรหัสตัวอย่างจะไม่เชื่อมผู้เล่นหลายคนจริง"}
          </p>
        </div>
      );
    }

    if (activePanel === "album") {
      return (
        <div className="panel-stack">
          <section className="album-summary">
            <span className="eyebrow">MY ALBUM</span>
            <h3>{photoCountLabel}</h3>
            <p>ภาพจะถูกเก็บไว้ในพื้นที่จัดเก็บภายในเบราว์เซอร์นี้ ไม่ได้อัปโหลดขึ้นเซิร์ฟเวอร์</p>
            <button className="primary-button full-button" type="button" onClick={captureScene} disabled={isCapturing}>
              {isCapturing ? "กำลังบันทึกภาพ..." : "ถ่ายภาพฉากปัจจุบัน"}
            </button>
          </section>
          {photos.length === 0 ? (
            <div className="empty-album">
              <div className="empty-album-frame" />
              <strong>ยังไม่มีภาพในอัลบั้ม</strong>
              <p>กดถ่ายภาพเพื่อเก็บบรรยากาศจากโลกเทศกาล</p>
            </div>
          ) : (
            <div className="photo-grid">
              {photos.map((photo) => (
                <article className="photo-card" key={photo.id}>
                  {photoUrls[photo.id] && <Image src={photoUrls[photo.id]} alt="ภาพจากโลกเทศกาลลอยกระทง" width={480} height={360} unoptimized />}
                  <div className="photo-card-footer">
                    <span>{new Date(photo.createdAt).toLocaleDateString("th-TH")}</span>
                    <button
                      type="button"
                      onClick={() => uploadPhoto(photo)}
                      disabled={!currentUser || uploadedPhotoIds.includes(photo.id) || uploadingPhotoId === photo.id}
                      aria-label="สำรองภาพไปยังบัญชีออนไลน์"
                    >
                      {uploadedPhotoIds.includes(photo.id) ? "สำรองแล้ว" : uploadingPhotoId === photo.id ? "กำลังส่ง..." : "สำรองออนไลน์"}
                    </button>
                    <button type="button" onClick={() => removePhoto(photo.id)} aria-label="ลบภาพนี้">ลบ</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="panel-stack">
        <section className="panel-section">
          <h4>คุณภาพกราฟิก</h4>
          <p className="field-hint">เลือกคุณภาพที่เหมาะกับอุปกรณ์ของคุณ</p>
          <div className="segmented-control">
            {(["low", "balanced", "high"] as const).map((quality) => (
              <button
                type="button"
                className={preferences.graphicsQuality === quality ? "is-active" : ""}
                key={quality}
                onClick={() => setPreferences((current) => ({ ...current, graphicsQuality: quality }))}
              >
                {quality === "low" ? "ประหยัด" : quality === "balanced" ? "สมดุล" : "สูง"}
              </button>
            ))}
          </div>
        </section>
        <section className="panel-section preference-list">
          <label className="preference-row">
            <span><strong>ลดการเคลื่อนไหว</strong><small>ลดการเคลื่อนไหวตกแต่งในฉาก</small></span>
            <input
              type="checkbox"
              checked={preferences.reducedMotion}
              onChange={(event) => setPreferences((current) => ({ ...current, reducedMotion: event.target.checked }))}
            />
          </label>
        </section>
        <section className="panel-section">
          <h4>ข้อมูลและความเป็นส่วนตัว</h4>
          <p className="subtle-note">ตัวละคร คำอธิษฐาน แบบกระทง และภาพถ่ายในรุ่นเริ่มต้นจะบันทึกในเบราว์เซอร์ของคุณ จนกว่าจะเชื่อมต่อบัญชีและฐานข้อมูล Supabase</p>
          <button
            className="danger-button full-button"
            type="button"
            onClick={() => {
              const confirmed = window.confirm("ต้องการลบข้อมูลตัวละคร กระทง คำอธิษฐาน และการตั้งค่าที่บันทึกในอุปกรณ์นี้หรือไม่?");
              if (!confirmed) return;
              window.localStorage.removeItem("lkfw:avatar:v1");
              window.localStorage.removeItem("lkfw:krathong:v1");
              window.localStorage.removeItem("lkfw:preferences:v1");
              window.localStorage.removeItem("lkfw:wishes:v1");
              window.localStorage.removeItem("lkfw:designs");
              setAvatar(DEFAULT_AVATAR);
              setKrathong(DEFAULT_KRATHONG);
              setPreferences(DEFAULT_PREFERENCES);
              setWishes([]);
              setSavedDesigns([]);
              setNotice("ล้างข้อมูลในเบราว์เซอร์แล้ว");
            }}
          >
            ล้างข้อมูลในอุปกรณ์นี้
          </button>
        </section>
        <section className="panel-section version-card">
          <span>LOY KRATHONG FANTASY WORLD</span>
          <strong>รุ่นเริ่มต้น 0.1.0</strong>
          <small>โลกสามมิติและเครื่องมือสร้างสรรค์</small>
        </section>
      </div>
    );
  };

  return (
    <main className="festival-app">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">LK</div>
          <div className="brand-copy">
            <strong>LOY KRATHONG</strong>
            <span>FANTASY WORLD</span>
          </div>
        </div>
        <div className="topbar-center">
          <span className="live-dot" />
          <span>โลกเทศกาลพร้อมให้สำรวจ</span>
          <span className="topbar-divider" />
          <span className="mode-label">{currentUser ? "บัญชีสมาชิก" : "โหมดผู้เยือน"}</span>
        </div>
        <div className="topbar-actions">
          <AccountControl onUserChange={handleAccountChange} />
          <button className="topbar-button" type="button" onClick={() => setCameraAngle((angle) => angle - 0.3)} aria-label="หมุนมุมกล้องซ้าย">หมุนซ้าย</button>
          <button className="topbar-button" type="button" onClick={() => setCameraAngle((angle) => angle + 0.3)} aria-label="หมุนมุมกล้องขวา">หมุนขวา</button>
          <button className="capture-button" type="button" onClick={captureScene} disabled={isCapturing}>
            {isCapturing ? "กำลังถ่าย..." : "ถ่ายภาพ"}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">เมนูหลัก</div>
          <nav className="main-navigation" aria-label="เมนูหลัก">
            {NAV_ITEMS.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${activePanel === item.id ? "is-active" : ""}`}
                onClick={() => changePanel(item.id)}
                aria-current={activePanel === item.id ? "page" : undefined}
              >
                <span className="nav-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="nav-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                <span className="nav-chevron">›</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="sidebar-footer-rule" />
            <strong>ค่ำคืนแห่งแสง</strong>
            <small>พื้นที่สร้างความทรงจำร่วมกัน</small>
          </div>
        </aside>

        <section className="world-stage" aria-label="โลกเทศกาลสามมิติ">
          <div className="scene-canvas">
            <WorldCanvasLoader
              avatar={avatar}
              krathong={krathong}
              moveDirection={moveDirection}
              cameraAngle={cameraAngle}
              hasFloated={hasFloated}
              reducedMotion={preferences.reducedMotion}
              graphicsQuality={preferences.graphicsQuality}
              remotePlayers={visibleRemotePlayers}
              onPositionChange={publishPosition}
            />
          </div>
          <div className="scene-vignette" />
          <div className="scene-heading">
            <div className="scene-location-tag"><span /> ริมแม่น้ำจันทร์</div>
            <h1>คืนแห่งแสง</h1>
            <p>ร่วมเดินทางไปกับความปรารถนาดีใต้แสงจันทร์</p>
          </div>
          <div className="scene-bottom">
            <div className="movement-control" aria-label="ปุ่มควบคุมการเดิน">
              <button type="button" className="move-up" aria-label="เดินไปข้างหน้า" onPointerDown={() => setMoveDirection({ x: 0, z: -1 })} onPointerUp={() => setMoveDirection({ x: 0, z: 0 })} onPointerLeave={() => setMoveDirection({ x: 0, z: 0 })} onPointerCancel={() => setMoveDirection({ x: 0, z: 0 })}>↑</button>
              <button type="button" className="move-left" aria-label="เดินไปทางซ้าย" onPointerDown={() => setMoveDirection({ x: -1, z: 0 })} onPointerUp={() => setMoveDirection({ x: 0, z: 0 })} onPointerLeave={() => setMoveDirection({ x: 0, z: 0 })} onPointerCancel={() => setMoveDirection({ x: 0, z: 0 })}>←</button>
              <button type="button" className="move-down" aria-label="เดินถอยหลัง" onPointerDown={() => setMoveDirection({ x: 0, z: 1 })} onPointerUp={() => setMoveDirection({ x: 0, z: 0 })} onPointerLeave={() => setMoveDirection({ x: 0, z: 0 })} onPointerCancel={() => setMoveDirection({ x: 0, z: 0 })}>↓</button>
              <button type="button" className="move-right" aria-label="เดินไปทางขวา" onPointerDown={() => setMoveDirection({ x: 1, z: 0 })} onPointerUp={() => setMoveDirection({ x: 0, z: 0 })} onPointerLeave={() => setMoveDirection({ x: 0, z: 0 })} onPointerCancel={() => setMoveDirection({ x: 0, z: 0 })}>→</button>
            </div>
            <div className="scene-action-stack">
              <button type="button" className="scene-action secondary" onClick={() => changePanel("krathong")}>ออกแบบกระทง</button>
              <button type="button" className="scene-action primary" onClick={() => changePanel("ceremony")}>เริ่มพิธีลอยกระทง</button>
            </div>
          </div>
          <div className="scene-caption">ใช้ W A S D หรือปุ่มควบคุมเพื่อเคลื่อนที่</div>
        </section>

        <aside className="detail-panel">
          <div className="detail-panel-header">
            <div>
              <span className="eyebrow">FESTIVAL MENU</span>
              <h2>{PANEL_TITLES[activePanel]}</h2>
            </div>
            <span className="panel-step">{String(NAV_ITEMS.findIndex((item) => item.id === activePanel) + 1).padStart(2, "0")}/07</span>
          </div>
          <div className="detail-panel-content">{panelContent()}</div>
          <div className="detail-panel-footer">
            <span className="footer-status-dot" />
            <span>ข้อมูลบันทึกในอุปกรณ์นี้</span>
          </div>
        </aside>
      </div>

      {notice && <div className="notice-toast" role="status" aria-live="polite">{notice}</div>}
    </main>
  );
}
