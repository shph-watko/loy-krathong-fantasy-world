# Loy Krathong Fantasy World

โลกเทศกาลลอยกระทงออนไลน์แบบ 3D Fantasy พัฒนาด้วย Next.js, React Three Fiber และ Supabase

## เริ่มต้นใช้งาน

ต้องใช้ Node.js 20.9 ขึ้นไป

```bash
npm install
cp .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000` เพื่อเข้าโลกเทศกาล โหมดผู้เยือนสามารถทดลองฉาก 3D และเครื่องมือสร้างสรรค์ได้โดยไม่ต้องตั้งค่า Supabase

## เชื่อมต่อ Supabase

โปรเจกต์นี้เชื่อมกับ Supabase Project `loy-krathong-fantasy-world` แล้ว (Region: Sydney, Project Ref: `czvlqmozvjpfdiwsztdx`)

1. คัดลอก `.env.example` เป็น `.env.local` แล้วตรวจค่า Project URL และ Publishable Key
2. เพิ่ม Redirect URL `http://localhost:3000/auth/callback` ใน Supabase Authentication > URL Configuration
3. ตั้งค่า Site URL และ Email provider ให้ตรงกับโดเมนที่ใช้งานจริง แล้วทดสอบ Magic Link
4. Migration ทั้งสี่ชุดถูกติดตั้งในฐานข้อมูลของโปรเจกต์ที่เชื่อมอยู่แล้ว หากสร้างฐานข้อมูลใหม่ ให้รันไฟล์ใน `supabase/migrations/` ตามลำดับ 001, 002, 003 และ 004 (รวม security hardening และสิทธิ์ Data API แบบ least privilege)

Publishable Key ถูกออกแบบให้ใช้ในแอปฝั่ง client ได้ โดยยังต้องใช้ RLS ควบคุมการเข้าถึงข้อมูล ห้ามนำ Service Role Key หรือ Secret Key มาใส่ใน `NEXT_PUBLIC_*` หรือ commit ลง GitHub

## ฟังก์ชันที่มีในรุ่นเริ่มต้น

- ฉากโลก 3D พร้อมวัด แม่น้ำ โคม แสงสะท้อน ต้นไม้ และดอกบัว
- เดินด้วย W/A/S/D, ปุ่มลูกศร หรือปุ่มสัมผัสบนหน้าจอ
- ปรับชื่อ สีผิว สีผม และสีชุดของตัวละคร
- ออกแบบกระทงและบันทึกแบบกระทงในเครื่อง
- เขียนคำอธิษฐานและเพิ่มกระทงลงในฉากพิธี
- ถ่ายภาพฉากและบันทึกไว้ใน IndexedDB; ผู้ใช้เลือกอัปโหลดภาพไปยัง private bucket ได้เอง
- สร้างรหัส/ลิงก์เชิญตัวอย่างในโหมดผู้เยือน
- เข้าสู่ระบบด้วย Magic Link ทางอีเมล
- สำรองข้อมูลตัวละคร แบบกระทง และคำอธิษฐานไปยัง Supabase เมื่อเข้าสู่ระบบ
- สร้างห้องส่วนตัวพร้อมลิงก์เชิญ หรือห้องสาธารณะที่เข้าร่วมด้วยรหัสได้
- ใช้ Realtime presence/broadcast เพื่อแสดงตำแหน่งผู้เล่นในห้องเดียวกัน
- ตัวละครมีชื่อแสดงในฉาก และมีตัวละครประกอบในพื้นที่เทศกาล
- Migration ฐานข้อมูลพร้อม Row Level Security และ private photo bucket

## คำสั่งตรวจสอบ

```bash
npm run lint
npm run typecheck
npm run build
```

## เอกสาร

ดู [Local Development](./docs/LOCAL-DEVELOPMENT.md), [Product Requirements](./docs/REQUIREMENTS.md), [Database Design](./docs/DATABASE-DESIGN.md) และ [Implementation Roadmap](./docs/IMPLEMENTATION-ROADMAP.md)

## ข้อจำกัดของรุ่นนี้

นี่คือ first playable build ไม่ใช่ระบบผลิตจริงที่สมบูรณ์ทุกเมนู ระบบผู้เล่นหลายคนต้องมี Supabase project, migrations, Auth และ Realtime configuration ที่พร้อมใช้งานก่อน ส่วนกล้องจริง การจัดการเพื่อน/รายงาน เนื้อหาเทศกาลทั้งหมด และฉากอื่น ๆ จะพัฒนาต่อเป็นลำดับ

ห้ามนำ Service Role Key ไปใส่ในตัวแปร `NEXT_PUBLIC_*` หรือส่งไปยังโค้ดฝั่งเบราว์เซอร์
