"use client";

import { useEffect, useState } from "react";

const SETTINGS_KEY = "ascent.timer.defaults.v1";
const MENU_KEY = "ascent.practice.menus.v1";
const DEFAULT_PRACTICE_SEC = 5 * 60;
const DEFAULT_REST_SEC = 2 * 60;
const DEFAULT_PRACTICE_MENUS = [
  {
    id: "basic",
    name: "基本打ち",
    minutes: 30,
    note: "",
  },
  {
    id: "serve",
    name: "サーブ練習",
    minutes: 20,
    note: "コース別に各50本\n回転の確認",
  },
  {
    id: "receive",
    name: "レシーブ練習",
    minutes: 25,
    note: "ツッツキ/フリック\n短い台上処理",
  },
  {
    id: "footwork",
    name: "フットワーク",
    minutes: 30,
    note: "2点→3点の動き\n前後の切り替え",
  },
];

function clampTo30Sec(totalSec: number) {
  return Math.min(60 * 10, Math.max(0, Math.round(totalSec / 30) * 30));
}

function splitTime(totalSec: number) {
  const sec = clampTo30Sec(totalSec);
  return { min: Math.floor(sec / 60), sec: sec % 60 };
}

function formatMMSS(totalSec: number) {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function SettingsPage() {
  const [practiceMin, setPracticeMin] = useState(5);
  const [practiceSec, setPracticeSec] = useState(0);
  const [restMin, setRestMin] = useState(2);
  const [restSec, setRestSec] = useState(0);
  const [saved, setSaved] = useState(false);
  const [menus, setMenus] = useState(DEFAULT_PRACTICE_MENUS);
  const [menuSaved, setMenuSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const value = raw ? JSON.parse(raw) : null;
    const practice = splitTime(value?.practiceSec ?? DEFAULT_PRACTICE_SEC);
    const rest = splitTime(value?.restSec ?? DEFAULT_REST_SEC);
    setPracticeMin(practice.min);
    setPracticeSec(practice.sec);
    setRestMin(rest.min);
    setRestSec(rest.sec);

    const menuRaw = localStorage.getItem(MENU_KEY);
    const menuValue = menuRaw ? JSON.parse(menuRaw) : null;
    if (Array.isArray(menuValue) && menuValue.length > 0) {
      setMenus(menuValue);
    }
  }, []);

  function handleSave() {
    const practiceTotal = clampTo30Sec(practiceMin * 60 + practiceSec);
    const restTotal = clampTo30Sec(restMin * 60 + restSec);
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ practiceSec: practiceTotal, restSec: restTotal })
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  function updateMenu(index: number, field: "name" | "minutes" | "note", value: string) {
    setMenus((prev) =>
      prev.map((menu, i) =>
        i === index
          ? {
              ...menu,
              [field]: field === "minutes" ? Number(value) : value,
            }
          : menu
      )
    );
  }

  function addMenu() {
    setMenus((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "新しいメニュー",
        minutes: 30,
        note: "",
      },
    ]);
  }

  function removeMenu(index: number) {
    setMenus((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMenuSave() {
    localStorage.setItem(MENU_KEY, JSON.stringify(menus));
    setMenuSaved(true);
    window.setTimeout(() => setMenuSaved(false), 1500);
  }

  const totalSec = clampTo30Sec(practiceMin * 60 + practiceSec) + clampTo30Sec(restMin * 60 + restSec);

  return (
    <main
      style={{
        padding: 20,
        paddingBottom: 100,
        minHeight: "100vh",
        width: "min(100%, 520px)",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        設定
      </h1>

      <div style={{ display: "grid", gap: 16, maxWidth: 360 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            練習時間
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={practiceMin}
              onChange={(e) => setPracticeMin(Number(e.target.value))}
            >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>
                  {i}分
                </option>
              ))}
            </select>
            <select
              value={practiceSec}
              onChange={(e) => setPracticeSec(Number(e.target.value))}
            >
              <option value={0}>00秒</option>
              <option value={30}>30秒</option>
            </select>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            休憩時間
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={restMin}
              onChange={(e) => setRestMin(Number(e.target.value))}
            >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>
                  {i}分
                </option>
              ))}
            </select>
            <select value={restSec} onChange={(e) => setRestSec(Number(e.target.value))}>
              <option value={0}>00秒</option>
              <option value={30}>30秒</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          合計 {formatMMSS(totalSec)}
        </div>

        <button
          className="cta-button"
          onClick={handleSave}
          style={{
            height: 48,
            borderRadius: 999,
            border: "none",
            background: "var(--blue-gradient)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            boxShadow: "var(--shadow-pill)",
            letterSpacing: 0.02,
          }}
        >
          保存
        </button>
        {saved && <div style={{ fontSize: 12, color: "#16a34a" }}>保存しました</div>}
      </div>

      <div style={{ height: 24 }} />

      <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>練習メニュー</div>
        {menus.map((menu, index) => (
          <div
            key={menu.id}
            style={{
              borderRadius: 16,
              padding: 14,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "grid",
              gap: 10,
            }}
          >
            <input
              value={menu.name}
              onChange={(e) => updateMenu(index, "name", e.target.value)}
              placeholder="メニュー名"
            />
            <input
              type="number"
              value={menu.minutes}
              onChange={(e) => updateMenu(index, "minutes", e.target.value)}
              placeholder="時間（分）"
            />
            <textarea
              value={menu.note}
              onChange={(e) => updateMenu(index, "note", e.target.value)}
              placeholder="メモ"
              style={{ minHeight: 80 }}
            />
            <button
              type="button"
              onClick={() => {
                if (window.confirm("削除します。よろしいですか？")) {
                  removeMenu(index);
                }
              }}
              className="cta-button"
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid #dc2626",
                background: "#ef4444",
                color: "#fff",
                fontWeight: 700,
                boxShadow: "0 8px 14px rgba(239, 68, 68, 0.28)",
              }}
            >
              削除
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addMenu}
          style={{
            height: 44,
            borderRadius: 12,
            border: "1px dashed var(--border)",
            background: "transparent",
            fontWeight: 700,
          }}
        >
          メニューを追加
        </button>

        <button
          className="cta-button"
          onClick={handleMenuSave}
          style={{
            height: 48,
            borderRadius: 999,
            border: "none",
            background: "var(--blue-gradient)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            boxShadow: "var(--shadow-pill)",
            letterSpacing: 0.02,
          }}
        >
          練習メニューを保存
        </button>
        {menuSaved && <div style={{ fontSize: 12, color: "#16a34a" }}>保存しました</div>}
      </div>
    </main>
  );
}
