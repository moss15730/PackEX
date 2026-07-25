import type { Metadata, Viewport } from "next";
import { Inter, Anuphan } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { NotifyProvider } from "@/components/notify";
import "./globals.css";

/** Latin + numerals — tight, neutral, excellent at UI sizes. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Thai — modern, low-contrast loopless face that pairs with Inter. */
const anuphan = Anuphan({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PackEX — ระบบวิดีโอหลักฐานการแพ็ค",
    template: "%s | PackEX",
  },
  description:
    "PackEX ระบบบันทึกวิดีโอการแพ็คสินค้าแบบ multi-tenant สำหรับคลังสินค้าและ fulfillment",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafb" },
    { media: "(prefers-color-scheme: dark)", color: "#111214" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${anuphan.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Paint the correct theme before first frame — no flash of wrong palette. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("packex-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s==="light"||s==="dark"?s:(d?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <ThemeProvider>
          <NotifyProvider>{children}</NotifyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
