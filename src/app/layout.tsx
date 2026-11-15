import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { CrewApp } from "@/components/CrewApp";
// Hook-free modules only: the "@/lib/i18n" barrel imports React client hooks, which a
// Server Component layout cannot pull in.
import { DEFAULT_LOCALE, INTL_LOCALE } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import "./globals.css";

// next/font self-hosts the files at build time, so the UI needs no network at runtime.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Every route renders from the crew profile stored on this device, so the server
// can only prerender an empty shell; skip instant-navigation validation for it.
export const instant = false;

export const metadata: Metadata = {
  title: messages[DEFAULT_LOCALE].meta.title,
  description: messages[DEFAULT_LOCALE].meta.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={INTL_LOCALE[DEFAULT_LOCALE]} className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <CrewApp>{children}</CrewApp>
      </body>
    </html>
  );
}
