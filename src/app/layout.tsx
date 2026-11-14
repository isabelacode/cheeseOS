import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { CrewApp } from "@/components/CrewApp";
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
  title: "cheeseOS · Gêmeo digital",
  description: "Gêmeo digital de saúde do tripulante, com escuta por voz e IA local.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <CrewApp>{children}</CrewApp>
      </body>
    </html>
  );
}
