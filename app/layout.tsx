import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "AI World Cup Recap Generator | Turn Your Tournament Into a Story",
    template: "%s | AI World Cup Recap",
  },
  description:
    "Turn matches, statistics, unforgettable moments, and player performances into a personalized AI-powered World Cup recap — complete with narrative and highlight video.",
  keywords: ["World Cup", "AI recap", "football", "highlights", "personalized video"],
  openGraph: {
    type: "website",
    siteName: "AI World Cup Recap Generator",
    title: "AI World Cup Recap Generator | Your World Cup. Your Story.",
    description:
      "Turn tournament data, unforgettable moments, and player performances into a personalized AI-powered recap.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "AI World Cup Recap Generator",
    description: "Your World Cup. Your Story. Personalized AI-powered tournament recaps.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
