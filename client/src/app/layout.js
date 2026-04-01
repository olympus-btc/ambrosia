import { Geist, Geist_Mono as GeistMono } from "next/font/google";

import "./globals.css";
import Providers from "@/providers";
import ModuleNavigation from "@components/ModuleNavigation";
import UpdateBanner from "@components/UpdateBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = GeistMono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Ambrosia PoS",
  description: "The system for the sovereign individual.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};



export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <UpdateBanner />
          <div className="">
            <ModuleNavigation show="none">{children}</ModuleNavigation>
          </div>
        </Providers>
      </body>
    </html>
  );
}
