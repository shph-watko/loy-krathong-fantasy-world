import { createClient } from "@/lib/supabase/client";

export type OnlineRoom = {
  id: string;
  code: string;
};

function getClient() {
  const client = createClient();
  if (!client) {
    throw new Error("ยังไม่ได้ตั้งค่า Supabase ในไฟล์ .env.local");
  }
  return client;
}

export async function createOnlineRoom(): Promise<OnlineRoom> {
  const client = getClient();
  const { data, error } = await client.rpc("create_festival_room", {
    requested_visibility: "private",
    requested_capacity: 8
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.room_id || !row?.room_code) {
    throw new Error("Supabase did not return a room identifier.");
  }

  return { id: row.room_id as string, code: row.room_code as string };
}

export async function createOnlineInvitation(roomId: string): Promise<string> {
  const client = getClient();
  const { data, error } = await client.rpc("create_room_invitation", {
    target_room: roomId,
    lifetime_minutes: 120,
    allowed_uses: 8
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) {
    throw new Error("Supabase did not return an invitation token.");
  }
  return data;
}

export async function joinOnlineRoomByInvite(token: string): Promise<string> {
  const client = getClient();
  const { data, error } = await client.rpc("join_room_by_invite", {
    invite_token: token
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) {
    throw new Error("Supabase did not return a room identifier.");
  }
  return data;
}

export async function joinPublicRoomByCode(code: string): Promise<string> {
  const client = getClient();
  const { data, error } = await client.rpc("join_room_by_code", {
    requested_code: code
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) {
    throw new Error("Supabase did not return a room identifier.");
  }
  return data;
}
