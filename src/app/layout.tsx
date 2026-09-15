import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/features/langflow-viewer/styles/langflow-viewer.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Five Star Support Centre",
  description: "NBFC Customer Support Control Centre",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
