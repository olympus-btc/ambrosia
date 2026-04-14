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

const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";

export const metadata = {
  title: "Ambrosia PoS",
  description: "The system for the sovereign individual.",
  ...(!isElectron && {
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Ambrosia POS",
    },
    icons: {
      apple: "/icons/apple-touch-icon.png",
    },
  }),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#166534",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <UpdateBanner />
          <ModuleNavigation show="none">{children}</ModuleNavigation>
        </Providers>
      </body>
    </html>
  );
}
