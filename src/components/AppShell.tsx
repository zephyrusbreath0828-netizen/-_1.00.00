"use client";

/**
 * アプリ全体のシェル
 * - 未ログイン時は /login へ誘導（ログイン画面以外）
 * - 下部タブナビゲーション
 * - エラー通知バー
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { useApp } from "@/lib/app-context";
import { devToolsEnabled } from "@/lib/dev-tools";

const NAV = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/shrines", label: "神社をさがす", icon: "search" },
  { href: "/goshuin", label: "御朱印帳", icon: "book" },
  { href: "/mypage", label: "マイページ", icon: "user" },
] as const;

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "#b23a30" : "#8a8377";
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "home")
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3.5l9 7" />
        <path d="M5.5 9.5V20h13V9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  if (name === "search")
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    );
  if (name === "book")
    return (
      <svg {...common}>
        <path d="M5 4.5h11a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2V4.5Z" />
        <path d="M9 4.5v15" />
        <path d="M12 9h3.5M12 12.5h3.5" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c1.4-3.6 4.2-5.2 7.5-5.2S18.1 16.4 19.5 20" />
    </svg>
  );
}

function Splash({ message = "読み込んでいます…" }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-sumi-soft">
      <span className="text-4xl">⛩</span>
      <p className="font-mincho text-lg">{message}</p>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, error, clearError } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";
  // 動作確認用: ?autologin=1 のときはデモログインの完了までリダイレクトしない
  const [autologin] = useState(() => {
    if (!devToolsEnabled()) return false;
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("autologin") === "1";
  });
  const [online, setOnline] = useState(true);

  // オフライン時に「なぜ失敗したか」が分かるよう状態を監視する
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (ready && !user && !isLogin && !autologin) router.replace("/login");
  }, [ready, user, isLogin, autologin, router]);

  if (!ready) return <Splash />;
  if (autologin && !user) return <Splash message="デモデータを準備しています…" />;
  if (!user && !isLogin) return <Splash message="ログイン画面へ移動しています…" />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
      <ServiceWorkerRegister />
      {!online && (
        <div
          role="status"
          className="sticky top-0 z-40 mx-3 mt-2 rounded-[12px] border border-washi-line bg-washi-deep px-3 py-2 text-[0.85rem] leading-snug text-sumi-soft"
        >
          オフラインです。電波の届く場所でお試しください（表示中の内容はそのまま閲覧できます）。
        </div>
      )}
      {error && (
        <div role="alert" className="sticky top-0 z-40 mx-3 mt-2 flex items-start gap-2 rounded-[12px] border border-shu/30 bg-[#fdf1ef] px-3 py-2 text-[0.86rem] text-shu-deep">
          <span className="mt-[2px]">⚠</span>
          <p className="flex-1 leading-snug">{error}</p>
          <button onClick={clearError} className="shrink-0 px-1 text-sumi-mute" aria-label="閉じる">
            ✕
          </button>
        </div>
      )}
      <main className={isLogin ? "flex-1" : "flex-1 pb-28"}>{children}</main>

      {!isLogin && (
        <nav
          aria-label="メインメニュー"
          className="fixed bottom-0 left-1/2 z-30 w-full max-w-[520px] -translate-x-1/2 border-t border-washi-line bg-[#fffdf8]/95 backdrop-blur pb-safe"
        >
          <ul className="grid grid-cols-4">
            {NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="nav-item flex flex-col items-center justify-center gap-[3px] text-[0.75rem] font-semibold"
                    style={{ color: active ? "#b23a30" : "#8a8377" }}
                  >
                    <NavIcon name={item.icon} active={active} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
