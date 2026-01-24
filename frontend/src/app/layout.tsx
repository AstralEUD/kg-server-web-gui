"use client"

import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { AuthProvider } from "@/components/auth-provider";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {!isLoginPage && <MobileNav />}
      {!isLoginPage && <Sidebar />}
      <main className={`flex-1 overflow-auto ${isLoginPage ? "" : ""}`}>
        {children}
      </main>
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <title>아르마 리포저 서버 매니저</title>
        <meta name="description" content="아르마 리포저 전용 서버 관리 웹 GUI" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon-180x180.png" />
      </head>
      <body className={`${inter.className} bg-zinc-950 text-white antialiased`}>
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
          <Toaster position="bottom-right" theme="dark" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
