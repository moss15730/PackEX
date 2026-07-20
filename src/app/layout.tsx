import type { Metadata } from "next";
import { Be_Vietnam_Pro, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { NotifyProvider } from "@/components/notify";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
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
      className={`${beVietnam.variable} ${spaceGrotesk.variable} h-full antialiased`}
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
