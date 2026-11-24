import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loy Krathong Fantasy World",
  description:
    "สำรวจโลกเทศกาลลอยกระทงสามมิติ สร้างตัวละคร ออกแบบกระทง และร่วมพิธีกับเพื่อน",
  applicationName: "Loy Krathong Fantasy World",
  keywords: ["Loy Krathong", "Thailand", "3D World", "Festival"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Loy Krathong World"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071627",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
