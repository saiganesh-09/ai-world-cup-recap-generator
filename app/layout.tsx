import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "AI World Cup Recap Generator | Turn Your Tournament Into a Story",
    template: "%s | AI World Cup Recap Generator",
  },
  description:
    "Turn matches, statistics, unforgettable moments, and player performances into a personalized AI-powered World Cup recap — with an automatically generated highlight video.",
  openGraph: {
    siteName: "AI World Cup Recap Generator",
    title: "AI World Cup Recap Generator | Your World Cup. Your Story.",
    description:
      "Turn tournament data, unforgettable moments, and player performances into a personalized AI-powered recap video.",
    type: "website",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "AI World Cup Recap Generator",
    description:
      "Turn tournament data into a personalized AI-powered recap video.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
