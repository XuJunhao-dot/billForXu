import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "billForXu",
  description: "个人净资产快照：快速录入 + 趋势图",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
