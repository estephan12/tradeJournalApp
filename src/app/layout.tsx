import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B0F14",
};

export const metadata: Metadata = {
  title: "TradeLab — Trading Journal & Analytics Platform",
  description: "Professional personal trading journal and performance analytics terminal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TradeLab",
  },
};

import { TradeProvider } from "@/context/trade-context";
import { TerminalLayout } from "@/components/layout/terminal-layout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#0B0F14]`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#0B0F14] text-[#F5F7FA]">
        <TradeProvider>
          <TerminalLayout>{children}</TerminalLayout>
        </TradeProvider>
      </body>
    </html>
  );
}
