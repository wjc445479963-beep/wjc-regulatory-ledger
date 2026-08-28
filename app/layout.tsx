import type { Metadata } from "next";
import "./globals.css";
import { sitePath } from "@/lib/site-path";

export const metadata: Metadata = {
  title: "wjc的韭菜花园",
  description: "医疗器械法规动态、现行标准与版本更新的公开参考台账。",
  icons: {
    icon: sitePath("/favicon.svg"),
    shortcut: sitePath("/favicon.svg"),
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
