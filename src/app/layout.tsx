import type { Metadata, Viewport } from "next";
import { Cormorant, Geist, Geist_Mono } from "next/font/google";
import { GUILD_NAME, GUILD_TAGLINE } from "@/config/guild";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Cormorant({ variable: "--font-display-serif", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  // Netlify provides URL (production) / DEPLOY_PRIME_URL (previews) at build and runtime.
  metadataBase: new URL(process.env.URL ?? process.env.DEPLOY_PRIME_URL ?? "http://localhost:3000"),
  title: { default: GUILD_NAME, template: `%s · ${GUILD_NAME}` },
  description: `${GUILD_NAME} — ${GUILD_TAGLINE}. Roster, raid calendar and progression.`,
};

export const viewport: Viewport = {
  themeColor: "#07050b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Live guild data on every request.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
