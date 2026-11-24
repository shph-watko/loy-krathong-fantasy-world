import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-loading">
      <div className="loading-emblem">LK</div>
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <p>หน้าที่เปิดอาจถูกย้ายหรือไม่มีอยู่ในระบบ</p>
      <Link className="primary-button back-home-link" href="/">กลับสู่โลกเทศกาล</Link>
    </main>
  );
}
