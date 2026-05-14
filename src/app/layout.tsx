import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BlockOS - AI 原生知识操作系统',
  description: '以 Block 为信息原子，以 AI 为原生操作系统的下一代文档环境',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
