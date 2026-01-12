"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/record", label: "記録確認", icon: "/icons/record.svg" },
  { href: "/timer", label: "タイマー", icon: "/icons/timer.svg" },
  { href: "/add", label: "記録追加", icon: "/icons/add.svg" },
  { href: "/profile", label: "プロフィール", icon: "/icons/profile.svg" },
  { href: "/settings", label: "設定", icon: "/icons/settings.svg" },
];

export default function BottomTab() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        background:
          "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.9))",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -12px 24px rgba(15, 23, 42, 0.08)",
        backdropFilter: "blur(10px)",
        zIndex: 10,
      }}
    >
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            style={{
              textDecoration: "none",
              color: isActive ? "var(--brand-blue)" : "var(--muted)",
              display: "grid",
              placeItems: "center",
              width: 50,
              height: 50,
              borderRadius: 14,
              background: isActive ? "rgba(47, 118, 246, 0.14)" : "transparent",
              boxShadow: isActive
                ? "0 10px 18px rgba(47, 118, 246, 0.22)"
                : "none",
            }}
          >
            <img
              src={item.icon}
              alt=""
              width={28}
              height={28}
              style={{ display: "block", opacity: isActive ? 1 : 0.6 }}
            />
          </Link>
        );
      })}
    </nav>
  );
}
