"use client";

import { useEffect } from "react";
import { SUPPORT_EMAIL } from "@/lib/contact";

/**
 * Last-resort boundary: replaces the root layout, so it cannot rely on the
 * app's fonts or CSS variables. Styling is inline and theme-aware on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[packex] fatal application error", error);
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          background: "#fafafb",
          color: "#1e2126",
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #111214 !important; color: #f5f6f7 !important; }
            .packex-fatal-card { background: #1a1c1f !important; border-color: #2c2f34 !important; }
            .packex-fatal-muted { color: #9aa1ab !important; }
            .packex-fatal-code { background: #232629 !important; color: #9aa1ab !important; }
          }
        `}</style>
        <main
          className="packex-fatal-card"
          style={{
            width: "100%",
            maxWidth: "26rem",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e9eaec",
            borderRadius: "1.25rem",
            padding: "2rem",
            boxShadow: "0 16px 40px -16px rgba(20,22,26,0.18)",
          }}
        >
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              margin: "0 auto",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(220,60,60,0.12)",
              color: "#c0392b",
              fontSize: "1.5rem",
            }}
            aria-hidden
          >
            !
          </div>

          <h1 style={{ margin: "1.25rem 0 0", fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
            ระบบขัดข้อง
          </h1>
          <p
            className="packex-fatal-muted"
            style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", lineHeight: 1.7, color: "#646b76" }}
          >
            PackEX ไม่สามารถเริ่มทำงานได้ กรุณาลองใหม่อีกครั้ง
            หากยังพบปัญหาโปรดติดต่อ {SUPPORT_EMAIL}
          </p>

          {error.digest ? (
            <p
              className="packex-fatal-code"
              style={{
                margin: "1rem 0 0",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                background: "#f4f5f6",
                color: "#646b76",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
              }}
            >
              รหัสอ้างอิง: {error.digest}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              width: "100%",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.75rem",
              border: "none",
              cursor: "pointer",
              background: "#00875a",
              color: "#ffffff",
              fontSize: "0.9375rem",
              fontWeight: 600,
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </main>
      </body>
    </html>
  );
}
