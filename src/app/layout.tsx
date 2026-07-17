import type { Metadata } from "next";
import { Michroma, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/**
 * Three faces, three jobs.
 *
 * Michroma is the entire display budget — one word, once, in the wordmark. It's a
 * wide geometric face with a lot of personality, which is exactly why it appears
 * precisely nowhere else. Spend the boldness in one place.
 *
 * Plex Sans and Plex Mono share a skeleton, so the board stays disciplined while the
 * wordmark carries the character. Mono isn't decoration here — it marks the things
 * that are literally machine addresses (URLs, hosts, endpoints) and separates them
 * from prose at a glance.
 */
const michroma = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "eternalglitch",
  description:
    "Projects living on eternalglitch.com — by Dhaval Tanna and Rutul Patel.",
  metadataBase: new URL("https://eternalglitch.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${michroma.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
