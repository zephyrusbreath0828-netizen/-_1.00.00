"use client";

import { useApp } from "@/lib/app-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const { backend, signInWithGoogle, signInAsDemo, error } = useApp();
  const [busy, setBusy] = useState<"google" | "demo" | null>(null);

  const run = async (kind: "google" | "demo") => {
    setBusy(kind);
    try {
      if (kind === "google") await signInWithGoogle();
      else await signInAsDemo();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-washi-texture flex min-h-dvh flex-col px-6 pt-safe">
      <div className="flex flex-1 flex-col justify-center py-10">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-washi-line bg-[#fffdf8] text-5xl shadow-sm">
            ⛩
          </div>
          <h1 className="font-mincho text-[2.1rem] leading-tight font-semibold tracking-[0.18em]">
            神旅帳
          </h1>
          <div className="wa-rule mx-auto mt-3 w-32" />
          <p className="mt-4 text-[0.95rem] leading-relaxed text-sumi-soft">
            全国47都道府県の神社をめぐり、
            <br />
            参拝の記録と御朱印をこの一冊に。
          </p>
        </div>

        <ul className="wa-card mt-9 space-y-3 p-5 text-[0.95rem]">
          {[
            ["神社をさがす", "現在地から近い神社、都道府県・名前で検索"],
            ["参拝記録を残す", "神社に到着したらGPSでワンタップ記録"],
            ["御朱印を保存する", "写真・参拝日・メモを御朱印帳に"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-3">
              <span className="mt-[3px] text-shu">◆</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-[0.82rem] leading-snug text-sumi-mute">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="pb-safe sticky bottom-0 space-y-3 py-6">
        {error && (
          <p className="rounded-[12px] border border-shu/30 bg-[#fdf1ef] px-3 py-2 text-[0.84rem] text-shu-deep">
            {error}
          </p>
        )}

        <button className="btn btn-primary w-full" onClick={() => run("google")} disabled={busy !== null}>
          {busy === "google" ? "接続しています…" : "Google アカウントでログイン"}
        </button>

        {!isFirebaseConfigured && (
          <>
            <button className="btn btn-outline w-full" onClick={() => run("demo")} disabled={busy !== null}>
              {busy === "demo" ? "準備しています…" : "デモモードで試す（登録不要）"}
            </button>
            <p className="text-center text-[0.76rem] leading-relaxed text-sumi-mute">
              Firebase 未設定のため
              <span className="font-semibold">デモモード</span>
              で起動します。データはこの端末のブラウザ内だけに保存されます。
            </p>
          </>
        )}

        <p className="text-center text-[0.74rem] leading-relaxed text-sumi-mute">
          <Link href="/" className="underline">
            利用規約・プライバシー
          </Link>
          ：位置情報は参拝記録の登録判定にのみ使用します。
        </p>
        <p className="text-center text-[0.7rem] text-sumi-mute">
          {backend.describe()}
        </p>
      </div>
    </div>
  );
}
