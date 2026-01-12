// app/layout.tsx
import "./globals.css";
import { TimerProvider } from "./context/TimerContext";
import BottomTab from "./components/BottomTab";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <TimerProvider>
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "rgba(255, 255, 255, 0.82)",
              backdropFilter: "blur(10px)",
              borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
            }}
          >
            <div
              style={{
                margin: "0 auto",
                width: "min(100%, 520px)",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <img
                src="/app-icon.svg"
                alt="Ascent"
                width={32}
                height={32}
                style={{ display: "block" }}
              />
              <div style={{ fontWeight: 800, letterSpacing: "0.04em" }}>
                ASCENT
              </div>
            </div>
          </header>
          <main style={{ minHeight: "100vh", paddingBottom: 90 }}>
            {children}
          </main>
          <BottomTab />
        </TimerProvider>
      </body>
    </html>
  );
}
