import type { Metadata, Viewport } from "next";
import { Lilita_One, Plus_Jakarta_Sans } from "next/font/google";

import { publicEnv } from "@/lib/public-env";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

import "./globals.css";

// Lilita One is for the logo and big headlines only.
const display = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lilita",
});
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-jakarta" });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: `${SITE_NAME}: book local services near you`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_PH" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FFF8EE",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
