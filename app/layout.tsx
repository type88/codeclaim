import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "SudoGrab - Promo Code Distribution for Developers",
    template: "%s | SudoGrab",
  },
  description:
    "Upload bulk promo codes, share one link, and let users grab the right code for their platform. Real-time tracking for app and game developers.",
  metadataBase: new URL("https://sudograb.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SudoGrab - Promo Code Distribution for Developers",
    description:
      "Upload bulk promo codes, share one link, and let users grab the right code for their platform.",
    url: "https://sudograb.com",
    siteName: "SudoGrab",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "SudoGrab - Promo Code Distribution for Developers",
    description:
      "Upload bulk promo codes, share one link, and let users grab the right code for their platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
