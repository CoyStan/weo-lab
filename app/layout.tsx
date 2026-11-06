import type { Metadata } from "next";
import { Figtree, Fraunces, IBM_Plex_Sans, Inter, Lexend, Nunito } from "next/font/google";
import "./globals.css";

// The lab's themes refer to these font variables; IBM Plex Sans is the default design's one family.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

// Candidate friendly sans faces for the Palari variations.
const figtree = Figtree({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800"], variable: "--font-figtree" });
const nunito = Nunito({ subsets: ["latin"], display: "swap", weight: ["400", "600", "700", "800"], variable: "--font-nunito" });
const lexend = Lexend({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"], variable: "--font-lexend" });

export const metadata: Metadata = {
  title: "WEO Scenario Lab",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plex.variable} ${inter.variable} ${fraunces.variable} ${figtree.variable} ${nunito.variable} ${lexend.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
