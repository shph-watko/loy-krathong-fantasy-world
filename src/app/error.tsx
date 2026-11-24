"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Festival application error:", error);
  }, [error]);

  return (
    <main className="app-loading">
      <div className="loading-emblem">LK</div>
      <h1>เกิดข้อผิดพลาดในการเปิดหน้าเว็บ</h1>
      <p>ลองโหลดหน้าเว็บอีกครั้ง หากยังพบปัญหา โปรดตรวจสอบการเชื่อมต่อและการตั้งค่าระบบ</p>
      <button className="primary-button" type="button" onClick={reset}>ลองอีกครั้ง</button>
    </main>
  );
}
