"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AccountControlProps = {
  onUserChange?: (user: { id: string; email: string | null } | null) => void;
};

export default function AccountControl({ onUserChange }: AccountControlProps) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      onUserChange?.(null);
      return;
    }

    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUser(data.user);
      onUserChange?.(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      onUserChange?.(nextUser ? { id: nextUser.id, email: nextUser.email ?? null } : null);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [supabase, onUserChange]);

  const sendSignInLink = async () => {
    if (!supabase) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage("กรุณากรอกอีเมลที่ถูกต้อง");
      return;
    }

    setBusy(true);
    setMessage("");
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", returnTo);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: callbackUrl.toString()
      }
    });
    setBusy(false);
    setMessage(error ? error.message : "ส่งลิงก์เข้าสู่ระบบไปยังอีเมลแล้ว กรุณาตรวจกล่องจดหมาย");
  };

  const signOut = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setMessage(error ? error.message : "ออกจากระบบแล้ว");
  };

  return (
    <details className="account-menu">
      <summary className="account-summary">
        <span className="account-avatar">{user ? "สมาชิก" : "ผู้เยือน"}</span>
        <span className="account-summary-copy">
          <strong>{user ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}</strong>
          <small>{user?.email ?? (supabase ? "บันทึกข้อมูลข้ามอุปกรณ์" : "ยังไม่ตั้งค่า Supabase")}</small>
        </span>
        <span className="account-chevron">⌄</span>
      </summary>
      <div className="account-popover">
        {user ? (
          <>
            <span className="eyebrow">SIGNED IN</span>
            <strong className="account-email">{user.email}</strong>
            <p>บัญชีนี้พร้อมใช้กับฟังก์ชันออนไลน์ที่ตั้งค่าใน Supabase แล้ว</p>
            <button className="secondary-button full-button" type="button" onClick={signOut} disabled={busy}>
              {busy ? "กำลังดำเนินการ..." : "ออกจากระบบ"}
            </button>
          </>
        ) : supabase ? (
          <>
            <span className="eyebrow">EMAIL SIGN IN</span>
            <strong>เข้าสู่ระบบด้วยลิงก์ทางอีเมล</strong>
            <p>ไม่ต้องตั้งรหัสผ่าน ระบบจะส่งลิงก์ยืนยันไปยังอีเมลของคุณ</p>
            <label className="field-label" htmlFor="account-email">อีเมล</label>
            <input
              id="account-email"
              className="text-input"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="primary-button full-button" type="button" onClick={sendSignInLink} disabled={busy}>
              {busy ? "กำลังส่ง..." : "ส่งลิงก์เข้าสู่ระบบ"}
            </button>
          </>
        ) : (
          <>
            <span className="eyebrow">SUPABASE SETUP</span>
            <strong>ยังไม่ได้เชื่อมต่อฐานข้อมูล</strong>
            <p>เพิ่ม URL และ Publishable Key ในไฟล์ .env.local จากนั้นตั้งค่า Supabase Auth และ Redirect URL</p>
          </>
        )}
        {message && <p className="account-feedback" role="status">{message}</p>}
      </div>
    </details>
  );
}
