import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HealthPredict AI — Precision Health Intelligence & Regional Hospital Network",
  description: "Empathetic, machine-learning powered chronic health risk prediction with KNN patient similarity proofs and 33 real Andhra Pradesh hospital recommendations.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${jakartaSans.variable} ${inter.variable} font-sans antialiased bg-[#0F172A] text-slate-100 selection:bg-teal-500 selection:text-white`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
