import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AI Assessment",
    template: "%s | AI Assessment",
  },
  description: "AI-powered learning and assessment platform. Upload study materials, generate practice quizzes, and track your progress.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AI Assessment",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className + " bg-slate-950 text-slate-200 selection:bg-purple-500/30"}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
