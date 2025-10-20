import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wasla Staff Portal",
  description: "Portail de gestion des files d'attente pour le personnel STE Dhraiff Services Transport",
  icons: {
    icon: [
      { url: "/icons/icon.png", sizes: "any" },
      { url: "/icons/icon.ico", sizes: "16x16 32x32" },
    ],
    apple: [
      { url: "/icons/icon-256x256.png", sizes: "256x256" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
