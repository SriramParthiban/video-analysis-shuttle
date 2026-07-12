import type { Metadata } from "next";
import { display, text, mono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "HANE 羽 — Badminton Match Analysis",
  description:
    "The coach's instrument. Upload a match, read each player's court coverage, workload, and weaknesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink-900 font-text grain">
        {children}
      </body>
    </html>
  );
}
