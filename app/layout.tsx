import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Query",
  description: "Asistente minimalista para consultar tu base de datos en lenguaje natural.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-neon-cyan/20`}
      >
        <div className="neon-blob bg-neon-cyan top-[-10%] left-[-10%]" />
        <div className="neon-blob bg-neon-purple bottom-[-10%] right-[-10%] animation-delay-2000" />
        <div className="neon-blob bg-neon-pink top-[40%] right-[-5%] opacity-10 animation-delay-4000" />
        {children}
      </body>
    </html>
  );
}
