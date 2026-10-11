import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import Script from "next/script";

import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";
import "katex/dist/katex.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Qollab · Understanding quantum errors",
    template: "%s · Qollab",
  },
  description:
    "An interactive feature on quantum error correction: Pauli errors, the Pauli basis, and a challenge to identify them on the Bloch sphere.",
};

// Applies the saved theme before first paint (light is the default).
const themeInit = `try{var t=localStorage.getItem('qc-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line/70">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-2 px-4 py-8 text-xs text-faint sm:flex-row sm:items-center sm:px-6">
            <p>Qollab · Module 1 — Understanding quantum errors.</p>
            <p className="font-mono">Quantum error correction, one experiment at a time.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
