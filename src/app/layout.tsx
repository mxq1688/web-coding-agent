import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import CacheBuster from "@/components/CacheBuster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodeBanana Base Template",
  description: "Clean & modern web development template - Optimized for AI-driven development with Next.js 15 + TypeScript + Tailwind CSS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CacheBuster />
        {children}
        <Script 
          src="https://sit-codemonkey.mobvoi.com/js/selectHigh/selecthigh.js" 
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
