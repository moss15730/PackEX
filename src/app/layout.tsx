import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Prompt } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { NotifyProvider } from "@/components/notify";
import "./globals.css";

const ibmPlexThai = IBM_Plex_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const prompt = Prompt({
  variable: "--font-display",
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "PackEX — ระบบวิดีโอหลักฐานการแพ็ค",
    template: "%s | PackEX",
  },
  description:
    "PackEX ระบบบันทึกวิดีโอการแพ็คสินค้าแบบ multi-tenant สำหรับคลังสินค้าและ fulfillment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${ibmPlexThai.variable} ${prompt.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <NotifyProvider>{children}</NotifyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
