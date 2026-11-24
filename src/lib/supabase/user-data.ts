"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  AvatarSettings,
  FestivalWish,
  KrathongSettings
} from "@/lib/types/festival";

function getClient() {
  const client = createClient();
  if (!client) {
    throw new Error("ยังไม่ได้ตั้งค่า Supabase ในไฟล์ .env.local");
  }
  return client;
}

export async function loadCloudAvatar(): Promise<AvatarSettings | null> {
  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data, error } = await client
    .from("avatar_configs")
    .select("display_name, outfit_color, skin_tone, hair_color")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    displayName: data.display_name,
    outfitColor: data.outfit_color,
    skinTone: data.skin_tone,
    hairColor: data.hair_color
  };
}

export async function saveCloudAvatar(avatar: AvatarSettings): Promise<void> {
  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกตัวละครออนไลน์");

  const { error } = await client.from("avatar_configs").upsert({
    user_id: authData.user.id,
    display_name: avatar.displayName.trim().slice(0, 24) || "ผู้มาเยือน",
    outfit_color: avatar.outfitColor,
    skin_tone: avatar.skinTone,
    hair_color: avatar.hairColor
  });
  if (error) throw error;
}

export async function saveCloudKrathong(krathong: KrathongSettings): Promise<void> {
  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกแบบกระทงออนไลน์");

  const { error } = await client.from("krathong_designs").insert({
    user_id: authData.user.id,
    name: krathong.designName.trim().slice(0, 48) || "แบบกระทงของฉัน",
    design: krathong,
    visibility: "private"
  });
  if (error) throw error;
}

export async function saveCloudWish(wish: FestivalWish): Promise<void> {
  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกคำอธิษฐานออนไลน์");

  const { error } = await client.from("wishes").insert({
    user_id: authData.user.id,
    body: wish.body,
    visibility: wish.visibility,
    moderation_status: "pending"
  });
  if (error) throw error;
}

export async function uploadPhotoToCloud(blob: Blob): Promise<string> {
  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("กรุณาเข้าสู่ระบบก่อนอัปโหลดภาพ");

  const extension =
    blob.type === "image/png" ? "png" :
    blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from("festival-photos")
    .upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { error: rowError } = await client.from("photos").insert({
    user_id: authData.user.id,
    storage_path: path,
    visibility: "private"
  });

  if (rowError) {
    await client.storage.from("festival-photos").remove([path]);
    throw rowError;
  }

  return path;
}
