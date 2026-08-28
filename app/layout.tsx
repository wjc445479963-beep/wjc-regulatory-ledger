import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "wjc的韭菜花园",
  description: "医疗器械法规动态、现行标准与版本更新的公开参考台账。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
